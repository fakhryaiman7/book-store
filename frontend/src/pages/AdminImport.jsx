import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axios from "../api/axios";
import { supabase } from "../lib/supabase";
import AdminSidebar from "../components/AdminSidebar";

const GOOGLE_BOOKS_API_KEY = "AIzaSyDbwnjRSV_-5KjkjLKoD8qGhsM8pgFFRBs";

const CATEGORIES = [
  { label: "Fantasy",   value: "Fantasy",   query: "subject:fantasy", gutenbergTopic: "fantasy" },
  { label: "Mystery",   value: "Mystery",   query: "subject:mystery", gutenbergTopic: "mystery" },
  { label: "Romance",   value: "Romance",   query: "subject:romance", gutenbergTopic: "romance" },
  { label: "History",   value: "History",   query: "subject:history", gutenbergTopic: "history" },
  { label: "Sci-Fi",     value: "Sci-Fi",     query: "subject:science fiction", gutenbergTopic: "science fiction" },
  { label: "Science",   value: "Science",   query: "subject:science", gutenbergTopic: "science" },
  { label: "Health",    value: "Health",    query: "subject:health", gutenbergTopic: "health" },
  { label: "Children",  value: "Children",  query: "subject:juvenile fiction", gutenbergTopic: "children" },
  { label: "Business",  value: "Business",  query: "subject:business", gutenbergTopic: "business" },
  { label: "Academic",  value: "Academic",  query: "subject:education", gutenbergTopic: "education" },
  { label: "Religious", value: "Religious", query: "subject:religion", gutenbergTopic: "religion" },
];

const AdminImport = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  // New Import Mode: full_read, preview
  const [minReadMode, setMinReadMode] = useState("full_read");
  const [processedCache] = useState(new Set());

  const checkConfig = () => {
    if (!GOOGLE_BOOKS_API_KEY || GOOGLE_BOOKS_API_KEY === "YOUR_API_KEY_HERE") {
        addLog("API Key missing or invalid. Please check AdminImport.jsx", "error");
        return false;
    }
    return true;
  };

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const generatePricing = (pageCount, mode) => {
    // Base pricing logic
    let purchasePrice = 120 + ((pageCount || 200) * 0.3) + Math.floor(Math.random() * 50);
    purchasePrice = Math.round(purchasePrice / 10) * 10;
    
    // If it's full_read public domain, maybe lower price? No, user wants "realistic" pricing in EGP.
    const pricePerDay = Math.round((purchasePrice * 0.05) / 5) * 5 || 5; 
    
    return { purchasePrice, pricePerDay };
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const internalize = async (url, bucket, folder) => {
    if (!url || typeof url !== 'string') return { url: null, error: null };
    if (url.includes("supabase.co") || url.includes("localhost")) return { url, error: null };
    
    try {
      const resp = await axios.post('/api/admin/internalize', { url, bucket, folder });
      return { url: resp.data.url, error: null };
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message;
      return { url: null, error: errMsg };
    }
  };

  const importCategory = async (catObj, isSequential = false) => {
    if (!checkConfig()) return;
    
    if (!isSequential) {
      setLoading(true);
      setLogs([]);
    }
    
    setStatus(`Searching for high-quality ${catObj.label} books...`);
    addLog(`Priority Search started for: ${catObj.label}`);

    let finalBooks = [];

    // --- STEP 1: Search Gutendex (Project Gutenberg) ---
    try {
      addLog(`Querying Gutendex for source files...`, "info");
      const gutenResp = await axios.get(`https://gutendex.com/books/?topic=${catObj.gutenbergTopic || catObj.value}`);
      const gutenItems = gutenResp.data.results || [];
      
      for (const item of gutenItems) {
        const formats = item.formats;
        // Priority: EPUB > PDF > HTML (if we can internalize them)
        const epubUrl = formats["application/epub+zip"];
        const pdfUrl = formats["application/pdf"];
        const htmlUrl = formats["text/html; charset=utf-8"] || formats["text/html"] || formats["text/plain; charset=utf-8"];
        const coverUrl = formats["image/jpeg"];

        let bestFileUrl = epubUrl || pdfUrl || htmlUrl;
        
        if (bestFileUrl) {
          finalBooks.push({
            title: item.title,
            author: item.authors?.[0]?.name || "Public Domain",
            image: coverUrl, 
            category: catObj.value,
            description: `A classic masterpiece from Project Gutenberg. Internalized for the BookVerse reader.`,
            book_file_url: bestFileUrl,
            read_mode: "full_read", // We set it here, but Step 3 will verify storage success
            language: "English",
            pages: 250, 
            isbn: `GUTEN-${item.id}`,
            published_year: item.authors?.[0]?.birth_year || 1900 
          });
        }
      }
      addLog(`Indexed ${finalBooks.length} candidates from Gutendex.`, "success");
    } catch (err) {
      addLog(`Gutendex fetch failed: ${err.message}`, "warn");
    }

    // --- STEP 1.5: Search Open Library ---
    if (finalBooks.length < 5) {
      try {
        addLog(`Querying Open Library for downloadable assets...`, "info");
        const olResp = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(catObj.value)}&has_fulltext=true&limit=10`);
        const olItems = olResp.data.docs || [];
        for (const item of olItems) {
          const iaId = item.ia?.[0];
          if (iaId) {
            // Archive dot org often blocks automated downloads, but we try anyway
            finalBooks.push({
              title: item.title,
              author: item.author_name?.[0] || "Various",
              image: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null,
              category: catObj.value,
              description: item.first_sentence?.[0] || `Classic entry in ${catObj.value} from Open Library.`,
              book_file_url: `https://archive.org/download/${iaId}/${iaId}.pdf`, // Try direct PDF
              read_mode: "full_read",
              language: "English",
              isbn: item.isbn?.[0] || null,
              published_year: item.first_publish_year || null
            });
          }
        }
      } catch (e) {
        addLog(`Open Library fetch failed: ${e.message}`, "warn");
      }
    }

    // --- STEP 2: Search Google Books ---
    if (finalBooks.length < 12) {
      addLog(`Querying Google Books for previews...`, "info");
      let retries = 0;
      const backoffDurations = [0, 5000, 10000, 20000];
      
      while (retries <= 3) {
        try {
          const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(catObj.query)}&maxResults=15&langRestrict=en&key=${GOOGLE_BOOKS_API_KEY}`;
          const gResp = await axios.get(url);
          const gItems = gResp.data.items || [];
          
          for (const item of gItems) {
            const info = item.volumeInfo;
            const access = item.accessInfo;
            
            let readMode = "metadata";
            let bookUrl = null;
            let previewUrl = info.previewLink;

            if (access.viewability === "ALL_PAGES" || access.publicDomain) {
              readMode = "full_read";
              // Google often requires OAuth for downloads, so internalization might fail
              bookUrl = access.pdf?.downloadLink || access.epub?.downloadLink || access.webReaderLink;
            } else if (access.viewability === "PARTIAL" || info.previewLink) {
              readMode = "preview";
            }

            if (readMode === "metadata") continue;

            finalBooks.push({
              title: info.title,
              author: info.authors ? info.authors[0] : "Unknown Author",
              image: info.imageLinks?.thumbnail?.replace("http://", "https://"),
              category: catObj.value,
              description: info.description || "A high-quality addition to our digital catalog.",
              book_file_url: bookUrl,
              preview_file_url: previewUrl,
              read_mode: readMode,
              language: info.language === "en" ? "English" : info.language || "English",
              published_year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
              pages: info.pageCount || 0,
              isbn: info.industryIdentifiers?.find(id => id.type.includes("ISBN"))?.identifier || null
            });
          }
          break;
        } catch (err) {
          if (err.response?.status === 429 && retries < 3) {
            retries++;
            await wait(backoffDurations[retries]);
          } else {
            addLog(`Google Books fetch failed: ${err.message}`, "error");
            break;
          }
        }
      }
    }

    // --- STEP 3: Filter & Process ---
    const modeWeight = { "full_read": 3, "preview": 2, "metadata": 1 };
    const minWeight = modeWeight[minReadMode] || 2;

    const filteredBooks = finalBooks
      .filter(b => modeWeight[b.read_mode] >= minWeight)
      .sort((a, b) => modeWeight[b.read_mode] - modeWeight[a.read_mode]) 
      .slice(0, 12); 

    setProgress({ current: 0, total: filteredBooks.length });
    addLog(`Processing ${filteredBooks.length} candidates for internal storage...`);

    let importedCount = 0;
    let skippedCount = 0;
    let upgradedCount = 0;

    for (const book of filteredBooks) {
      setProgress({ current: importedCount + skippedCount + 1, total: filteredBooks.length });
      
      const cacheKey = book.isbn || `${book.title}-${book.author}`;
      if (processedCache.has(cacheKey)) { skippedCount++; continue; }
      if (!book.image) { skippedCount++; continue; }

      let existingBook = null;
      try {
        if (book.isbn) {
          const { data } = await supabase.from("books").select("id, read_mode").eq("isbn", book.isbn).limit(1);
          existingBook = data && data.length > 0 ? data[0] : null;
        } else {
          const { data } = await supabase.from("books").select("id, read_mode").eq("title", book.title).eq("author", book.author).limit(1);
          existingBook = data && data.length > 0 ? data[0] : null;
        }
      } catch (e) {}

      // --- Internalize Logic (The Root Fix) ---
      addLog(`Internalizing assets for "${book.title}"...`, "info");
      
      const { url: localImage } = await internalize(book.image, 'book-covers', 'covers');
      const { url: localFile, error: fileError } = await internalize(book.book_file_url, 'book-files', 'books');
      const { url: localPreview, error: previewError } = await internalize(book.preview_file_url, 'book-files', 'previews');

      // VERIFICATION: Only stay as full_read if the file is now in OUR storage
      let finalReadMode = book.read_mode;
      if (finalReadMode === "full_read" && (!localFile || !localFile.includes('supabase.co'))) {
         // Downgrade to preview if possible, else metadata
         if (localPreview && localPreview.includes('supabase.co')) {
            finalReadMode = "preview";
            addLog(`Downgraded "${book.title}" to preview (Full file download blocked: ${fileError}).`, "warn");
         } else {
            finalReadMode = "metadata";
            addLog(`Downgraded "${book.title}" to metadata (Storage failed: ${fileError || previewError || 'Unknown Error'}).`, "warn");
         }
      }

      // If user strictly requested full_read and we failed, skip it
      if (minReadMode === "full_read" && finalReadMode !== "full_read") {
         addLog(`Skipped "${book.title}" - Strict Full Read requirement not met.`, "info");
         skippedCount++;
         continue;
      }

      // Upgrade check
      if (existingBook) {
        if (modeWeight[finalReadMode] > modeWeight[existingBook.read_mode]) {
          const { error } = await supabase.from("books")
            .update({ 
               read_mode: finalReadMode, 
               book_file_url: localFile,
               preview_file_url: localPreview,
               updated_at: new Date().toISOString()
            })
            .eq("id", existingBook.id);
          
          if (!error) { addLog(`Upgraded "${book.title}" to ${finalReadMode} (Internalized)`, "success"); upgradedCount++; }
        } else {
          addLog(`Skipped "${book.title}" - Already exists.`, "info");
        }
        skippedCount++;
        processedCache.add(cacheKey);
        continue;
      }

      const pricing = generatePricing(book.pages, finalReadMode);
      
      const { error } = await supabase.from("books").insert([{
          ...book,
          image: localImage,
          book_file_url: localFile,
          preview_file_url: localPreview,
          read_mode: finalReadMode,
          purchase_price: pricing.purchasePrice,
          rental_price: pricing.pricePerDay,
          price_per_day: pricing.pricePerDay,
          available_for_sale: true,
          available_for_rent: true,
          count_in_stock: 10,
          updated_at: new Date().toISOString()
      }]);

      if (!error) {
        addLog(`Imported ${finalReadMode}: "${book.title}" (100% Internal)`, "success");
        importedCount++;
        processedCache.add(cacheKey);
      } else {
        addLog(`Error saving "${book.title}": ${error.message}`, "error");
      }

      await wait(2000); 
    }

    setStatus(`Finish! Imported: ${importedCount}, Upgraded: ${upgradedCount}, Skipped: ${skippedCount}`);
    if (!isSequential) setLoading(false);
  };

  const importAll = async () => {
    if (!checkConfig()) return;
    if (loading) return;
    setLoading(true);
    setLogs([]);
    addLog(`Starting GLOBAL Priority Import (Min Mode: ${minReadMode})...`, "info");
    
    for (let i = 0; i < CATEGORIES.length; i++) {
        await importCategory(CATEGORIES[i], true);
        if (i < CATEGORIES.length - 1) {
            addLog(`Pausing 3s...`, "info");
            await wait(3000);
        }
    }
    
    setStatus("Global Priority Import Complete.");
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col md:flex-row transition-colors duration-200">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Smart Book Import</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Prioritizing readable and public domain content.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs mb-6 px-2">Import Policy</h3>
              
              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Min Readability Level</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: "full_read", label: "Full Read Only (Strict Policy)" },
                    { val: "preview", label: "Full Read + Previews" }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setMinReadMode(opt.val)}
                      className={`text-left px-5 py-3 rounded-xl font-bold text-xs transition-all border ${
                        minReadMode === opt.val 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border-transparent hover:border-primary/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={importAll}
                disabled={loading}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 disabled:opacity-50 transition-all text-xs uppercase tracking-widest mb-4"
              >
                {loading ? "Process Running..." : "Import All Categories"}
              </button>

              <div className="space-y-2 mt-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Individual Fast Import</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.value}
                      onClick={() => importCategory(cat)}
                      disabled={loading}
                      className="text-left px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 font-bold text-[10px] hover:bg-primary/5 hover:text-primary transition-all border border-transparent hover:border-primary/10 disabled:opacity-50"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading && (
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 truncate">{status}</p>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100 || 0}%` }}
                  />
                </div>
                <p className="text-right text-[10px] font-black text-gray-400 mt-2">{progress.current} / {progress.total}</p>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-[2rem] p-8 shadow-2xl h-[600px] flex flex-col border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Priority Logs</h3>
                <button onClick={() => setLogs([])} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Clear</button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {logs.length === 0 ? (
                  <div className="text-gray-500 font-mono text-xs italic space-y-2">
                    <p>Waiting for process to start...</p>
                    <p className="text-gray-700 mt-4 border-t border-white/5 pt-4">Policy: {minReadMode === "full_read" ? "Books with full legal attachments only." : "Books with full attachments or previews."}</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-4 font-mono text-[11px] border-b border-white/5 pb-2 animate-in fade-in slide-in-from-left duration-300">
                      <span className="text-gray-600 shrink-0">[{log.time}]</span>
                      <span className={`
                        ${log.type === 'success' ? 'text-green-400 font-bold' : ''}
                        ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                        ${log.type === 'warn' ? 'text-yellow-400' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                      `}>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminImport;

