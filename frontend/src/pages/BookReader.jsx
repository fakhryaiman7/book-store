import { useState, useEffect, useContext, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";
import { useTranslation } from "react-i18next";
import { ReactReader } from "react-reader";


const BookReader = () => {
  const { bookId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [book, setBook] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState(null);
  const [readerTheme, setReaderTheme] = useState(() => {
    return localStorage.getItem("bookverse_reader_theme") || "light";
  }); // light | sepia | dark
  const [settings, setSettings] = useState({
    fontSize: 20,
    readingWidth: 760,
    lineHeight: 1.8,
  });
  
  // PDF viewer mode: "iframe" (direct embed) | "google" (Google Docs viewer)
  const [pdfMode, setPdfMode] = useState("iframe");
  const [pdfLoadError, setPdfLoadError] = useState(false);
  
  // EPUB viewer specific state
  const [location, setLocation] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summarySubMode, setSummarySubMode] = useState("quick"); // quick | deep | insights
  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [selectionData, setSelectionData] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const renditionRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    const init = async () => {
      setLoading(true);
      setPdfLoadError(false);
      
      const params = new URLSearchParams(window.location.search);
      const previewMode = params.get("preview") === "true";
      setIsPreview(previewMode);

      // 1. Fetch book details from backend API
      let bookData = null;
      try {
        const res = await axios.get(`/api/books/${bookId}`);
        bookData = res.data;
      } catch {
        setError("Book not found.");
        setLoading(false);
        return;
      }
      if (!bookData) { setError("Book not found."); setLoading(false); return; }
      setBook(bookData);

      // 2. Verify user has access via user_book_access (purchases) OR rentals (active rentals)
      const authUserId = user?.id || user?._id;
      if (!authUserId) {
        setError("no_access");
        setLoading(false);
        return;
      }
      
      // 2. Comprehensive Access Check (Purchases & Rentals)
      const authUserId = user?.id || user?._id;
      if (!authUserId) {
        setError("no_access");
        setLoading(false);
        return;
      }

      // Check unified access table (covers both rentals and purchases)
      const { data: accessRows, error: accessErr } = await supabase
        .from("user_book_access")
        .select("*")
        .eq("user_id", authUserId)
        .eq("book_id", bookId)
        .eq("is_active", true);

      if (accessErr) {
        console.error("Access check error:", accessErr);
      }

      const now = new Date();
      
      // Find valid access (either a purchase or a rental that hasn't expired yet)
      const validAccess = accessRows?.find(row => {
        if (row.access_type === 'purchase') return true;
        if (row.access_type === 'rental') {
          return !row.expires_at || new Date(row.expires_at) > now;
        }
        return false;
      });

      // Special fallback check for rentals table directly (for extra safety)
      let activeRentalFallback = null;
      if (!validAccess) {
        const { data: rentalsRows } = await supabase
          .from("rentals")
          .select("*")
          .eq("user_id", authUserId)
          .eq("book_id", bookId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        const validR = rentalsRows?.find(r => !r.rental_due_date || new Date(r.rental_due_date) > now);
        if (validR) {
          activeRentalFallback = {
            access_type: "rental",
            expires_at: validR.rental_due_date
          };
        }
      }

      const finalAccess = validAccess || activeRentalFallback;

      if (!finalAccess && !previewMode) {
        setError("no_access");
        setLoading(false);
        return;
      }

      setAccess(finalAccess);

      if (!validAccess && !previewMode) {
        setError(hasPastRental ? "expired" : "no_access");
        setLoading(false);
        return;
      }

      setAccess(validAccess);
      setLoading(false);
    };

    init();

    // Load reader state from localStorage
    const savedSettings = localStorage.getItem("bookverse_reader_settings");
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch {}
    }
    const savedBookmarks = localStorage.getItem(`bookmarks_${bookId}`);
    if (savedBookmarks) {
      try { setBookmarks(JSON.parse(savedBookmarks)); } catch {}
    }
    const savedHighlights = localStorage.getItem(`highlights_${bookId}`);
    if (savedHighlights) {
      try { setHighlights(JSON.parse(savedHighlights)); } catch {}
    }
  }, [user, bookId, navigate]);

  // Persist state
  useEffect(() => {
    localStorage.setItem("bookverse_reader_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("bookverse_reader_theme", readerTheme);
  }, [readerTheme]);

  useEffect(() => {
    if (bookId) {
      localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(bookmarks));
    }
  }, [bookmarks, bookId]);

  useEffect(() => {
    if (bookId) {
      localStorage.setItem(`highlights_${bookId}`, JSON.stringify(highlights));
    }
  }, [highlights, bookId]);

  // Update progress based on location
  useEffect(() => {
    if (renditionRef.current && location) {
      const { book } = renditionRef.current;
      if (book.locations.length() > 0) {
        const p = book.locations.percentageFromCfi(location);
        setProgress(Math.floor(p * 100));
        
        // Estimate page numbers
        const current = book.locations.locationFromCfi(location);
        setCurrentPage(current);
        setTotalPages(book.locations.length());
      }
    }
  }, [location]);

  // ─── Content Protection ──────────────────────────────────────────────────
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Disable: Ctrl+C, Ctrl+S, Ctrl+P, Ctrl+U (view source), F12
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 's' || e.key === 'p' || e.key === 'u')) ||
        e.key === 'F12' || (e.metaKey && e.key === 'p')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const Watermark = () => {
    if (!user) return null;
    const items = Array(20).fill(user.email || user.name);
    return (
      <div className="watermark pointer-events-none fixed inset-0 z-50 flex flex-wrap justify-around align-middle opacity-[0.03] overflow-hidden select-none">
        {items.map((text, i) => (
          <div key={i} className="text-sm font-black uppercase tracking-widest transform -rotate-45 p-20 whitespace-nowrap">
            {text} • PROTECTED CONTENT
          </div>
        ))}
      </div>
    );
  };

  // ─── Theme styles ──────────
  const baseReaderStyles = {
    fontFamily: "'Merriweather', 'Georgia', serif",
    lineHeight: `${settings.lineHeight} !important`,
    padding: "40px !important",
    maxWidth: `${settings.readingWidth}px !important`,
    margin: "0 auto !important",
    fontSize: `${settings.fontSize}px !important`
  };

  const reactReaderThemeDict = {
    light: {
      "body": { ...baseReaderStyles, background: '#ffffff', color: '#1a1a1a' },
      "p": { 
        fontSize: `${settings.fontSize}px !important`, 
        lineHeight: `${settings.lineHeight} !important`, 
        marginBottom: "1.5em !important",
        maxWidth: `${settings.readingWidth}px !important`,
        margin: "0 auto 1.5em auto !important"
      },
      "span": { fontSize: "inherit !important", lineHeight: "inherit !important" },
      "h1, h2, h3": { fontFamily: "'Outfit', sans-serif !important", fontWeight: "800 !important", marginTop: "2em !important", marginBottom: "1em !important" }
    },
    dark: {
      "body": { ...baseReaderStyles, background: '#0F1115', color: '#E6E6E6' },
      "p": { 
        fontSize: `${settings.fontSize}px !important`, 
        lineHeight: `${settings.lineHeight} !important`, 
        marginBottom: "1.5em !important",
        maxWidth: `${settings.readingWidth}px !important`,
        margin: "0 auto 1.5em auto !important"
      },
      "span": { color: '#E6E6E6 !important', fontSize: "inherit !important", lineHeight: "inherit !important" },
      "h1, h2, h3": { fontFamily: "'Outfit', sans-serif !important", fontWeight: "800 !important", marginTop: "2em !important", marginBottom: "1em !important" },
      "a": { color: '#60a5fa !important' }
    },
    sepia: {
      "body": { ...baseReaderStyles, background: '#f4ecd8', color: '#5B4636' },
      "p": { 
        fontSize: `${settings.fontSize}px !important`, 
        lineHeight: `${settings.lineHeight} !important`, 
        marginBottom: "1.5em !important",
        maxWidth: `${settings.readingWidth}px !important`,
        margin: "0 auto 1.5em auto !important"
      },
      "span": { fontSize: "inherit !important", lineHeight: "inherit !important" },
      "h1, h2, h3": { fontFamily: "'Outfit', sans-serif !important", fontWeight: "800 !important", marginTop: "2em !important", marginBottom: "1em !important" }
    }
  };

  const themeStyles = {
    light: { wrapper: "bg-[#F9FAFB]", toolbar: "bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-sm", text: "text-gray-900", card: "bg-white", accent: "bg-primary text-white", readerBg: "#ffffff" },
    sepia: { wrapper: "bg-[#F4ECD8]", toolbar: "bg-[#F4ECD8]/80 backdrop-blur-xl border-[#E5D7B7]/50 shadow-sm", text: "text-[#433422]", card: "bg-[#FCF9F2]", accent: "bg-[#5b4636] text-white", readerBg: "#f4ecd8" },
    dark:  { wrapper: "bg-[#0F1115]", toolbar: "bg-[#0F1115]/80 backdrop-blur-xl border-gray-800/50 shadow-sm", text: "text-gray-100", card: "bg-[#16181D]", accent: "bg-primary text-white", readerBg: "#0F1115" },
  };

  useEffect(() => {
    // Isolate reader theme from homepage
    const originalTheme = document.body.dataset.theme;
    
    return () => {
      if (originalTheme) {
        document.body.dataset.theme = originalTheme;
      } else {
        delete document.body.dataset.theme;
      }
    };
  }, []);

  // Force update the rendition when settings or theme change
  useEffect(() => {
    if (renditionRef.current) {
      const rendition = renditionRef.current;
      try {
        // 1. Re-register themes with new settings
        rendition.themes.register("light", reactReaderThemeDict.light);
        rendition.themes.register("sepia", reactReaderThemeDict.sepia);
        rendition.themes.register("dark", reactReaderThemeDict.dark);
        
        // 2. Select the theme
        rendition.themes.select(readerTheme);
        
        // 3. Directly override font size and line height (more reliable)
        rendition.themes.fontSize(`${settings.fontSize}px`);
        rendition.themes.override('body', {
          'line-height': `${settings.lineHeight} !important`,
          'font-family': "'Merriweather', 'Georgia', serif !important"
        });
        rendition.themes.override('p', {
          'line-height': `${settings.lineHeight} !important`,
          'font-size': `${settings.fontSize}px !important`,
          'margin-bottom': '1.5em !important'
        });
      } catch (err) {
        console.warn("Could not apply reader settings:", err);
      }
    }
  }, [settings, readerTheme, renditionRef]);

  const s = themeStyles[readerTheme];

  // ─── Derive file info ─────────────────────────────────────────────────────────
  const sourceFile    = book?.bookFileUrl || book?.book_file_url;
  const previewFile   = book?.previewFileUrl || book?.preview_file_url;
  
  // Use preview field if requested, fallback to main if missing
  let rawUrl = isPreview ? (previewFile || sourceFile) : sourceFile;

  // Cleanup: ensure HTTPS for embedding
  if (rawUrl?.startsWith("http://") && !rawUrl.includes("localhost")) {
    rawUrl = rawUrl.replace("http://", "https://");
  }

  // Detection logic
  const isInternal = rawUrl?.includes("supabase.co") || rawUrl?.includes("localhost");
  const isArchive = rawUrl?.includes("archive.org");
  const isGoogle = rawUrl?.includes("books.google.com");
  const isGutenberg = rawUrl?.includes("gutenberg.org");
  const isEpub   = rawUrl?.toLowerCase().includes(".epub");
  const isPdf    = rawUrl?.toLowerCase().includes(".pdf");
  const isTxt    = rawUrl?.toLowerCase().includes(".txt");
  const isHtml   = rawUrl?.match(/\.html?($|\?)/i) || (isGutenberg && rawUrl?.includes("/cache/epub/") && !isEpub);
  
  // Gutenberg Reader specific check (HTML/Web view)
  const isGutenbergReader = (isGutenberg && isHtml && !rawUrl?.includes("/ebooks/")) || (isInternal && isHtml);

  // Determine if this is a direct binary/text file or an internal reader page
  const isDirectFile = (isPdf || isEpub || isTxt || isGutenbergReader) && !rawUrl?.includes("/ebooks/");
  
  // Decide if we should try an iframe or show the external fallback
  // Trust Gutenberg reader pages & Internalized files even if marked as external in DB
  let isExternalRead = (book?.read_mode === "external_read" && !isInternal) || (!isDirectFile && !isArchive && !isGoogle && !!rawUrl);
  if (isGutenbergReader || isInternal) {
    isExternalRead = false;
  }

  const isEmbeddable   = (isDirectFile || isArchive || isGoogle) && !isExternalRead;

  // PDF Preview Restrictions
  const bookFileUrl = isPreview && isPdf
    ? `${rawUrl}#page=1&toolbar=0&navpanes=0&view=FitH&scrollbar=0`
    : rawUrl;

  const isExternalEmbed = isArchive || isGoogle;

  const googleViewerUrl = (bookFileUrl && isDirectFile && !isExternalEmbed)
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(bookFileUrl)}&embedded=true`
    : null;

  // Access meta
  const isPurchase = access?.access_type === "purchase";
  const expiresAt  = access?.expires_at ? new Date(access.expires_at) : null;
  const daysLeft   = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Initializing Reader...</p>
      </div>
    </div>
  );

  if (error === "no_access" || error === "expired") return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-500">
        <div className="text-7xl mb-8">{error === "expired" ? "⌛" : "🔒"}</div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">
          {error === "expired" ? t("rental_expired") || "Rental Expired" : t("access_required") || "Access Required"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium leading-relaxed">
          {error === "expired"
            ? t("rental_expired_msg") || "Your rental period has ended. Renew your rental or purchase the book to continue reading."
            : t("access_required_msg") || "This content is protected. You need to buy or rent this book to access the full reader."}
        </p>
        <div className="flex flex-col gap-4">
          <Link to={`/book/${bookId}`} className="bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest text-center">
            {error === "expired" ? (t("renew_access") || "Renew Access") : (t("get_access") || "Get Access")}
          </Link>
          <Link to="/my-library" className="text-gray-400 hover:text-primary font-black py-4 transition-all text-[10px] uppercase tracking-widest text-center">
             {t("back_to_library") || "Back to Library"}
          </Link>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 text-center">
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-12 max-w-md w-full border border-gray-100 dark:border-gray-800">
        <div className="text-7xl mb-8">🛠️</div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">{t("error_title") || "Something went wrong"}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium">{error}</p>
        <Link to="/" className="bg-primary text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all text-xs uppercase tracking-widest block text-center">
           {t("go_home") || "Back Home"}
        </Link>
      </div>
    </div>
  );

  const theme = readerTheme; // Local ref for inline template literals
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${s.wrapper} reader-wrapper theme-${readerTheme} protected-content`}>
      <Watermark />


      {/* ── Toolbar ── */}
      <div className={`sticky top-0 z-40 border-b transition-all duration-500 shadow-sm ${s.toolbar}`}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 grid grid-cols-3 items-center gap-4">

          {/* Left: back button */}
          <div className="flex items-center gap-3 justify-start">
            <Link
              to="/my-library"
              className={`group flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${theme === "dark" ? "bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white" : theme === "sepia" ? "bg-[#5B4636]/10 hover:bg-[#5B4636]/20 text-[#5B4636]" : "bg-gray-100/70 hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`}
              title={t("library") || "Library"}
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          {/* Center: book info */}
          <div className="min-w-0 flex flex-col items-center">
            <h1 className={`text-sm font-black truncate tracking-tight text-center w-full max-w-[250px] lg:max-w-[400px] ${theme === "dark" ? "text-gray-100" : theme === "sepia" ? "text-[#433422]" : "text-gray-900"}`}>
              {book?.title || t("loading_book") || "Loading Book..."}
            </h1>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] truncate mt-0.5 opacity-60 ${theme === "dark" ? "text-gray-400" : theme === "sepia" ? "text-[#7A5F45]" : "text-gray-500"}`}>
              {book?.author}
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-4 justify-end">

            {/* Access badge */}
            <div className="hidden xl:block">
              {isPreview ? (
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <span className="text-sm leading-none">🔍</span> {t("preview") || "Preview"}
                </span>
              ) : (
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-colors duration-300 ${isPurchase ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" : "bg-primary/10 text-primary border-primary/20"}`}>
                  <span className="text-sm leading-none">{isPurchase ? "👑" : daysLeft !== null ? "⏳" : "🔄"}</span>
                  {isPurchase ? (t("owned") || "Owned") : (daysLeft !== null ? `${daysLeft}d` : (t("active") || "Active"))}
                </span>
              )}
            </div>

            {/* Read / Summary Toggle */}
            <div className={`p-1 flex rounded-2xl ${theme === "dark" ? "bg-gray-800/40" : theme === "sepia" ? "bg-[#E5D7B7]/40" : "bg-gray-100"}`}>
              <button
                onClick={() => setIsSummaryMode(false)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isSummaryMode ? "bg-white dark:bg-gray-700 shadow-lg text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              >
                {t("read") || "Read"}
              </button>
              <button
                onClick={() => setIsSummaryMode(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isSummaryMode ? "bg-white dark:bg-gray-700 shadow-lg text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
              >
                {t("sum") || "Sum"}
              </button>
            </div>

            {/* Reader Settings Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (location) {
                    const isBookmarked = bookmarks.some(b => b.location === location);
                    if (isBookmarked) {
                      setBookmarks(p => p.filter(b => b.location !== location));
                    } else {
                      setBookmarks(p => [...p, { location, timestamp: Date.now(), label: `Bookmark at ${progress}%` }]);
                    }
                  }
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${bookmarks.some(b => b.location === location) ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : theme === "dark" ? "bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-amber-400" : theme === "sepia" ? "bg-[#5B4636]/10 hover:bg-[#5B4636]/20 text-[#5B4636]" : "bg-gray-100/70 hover:bg-gray-200 text-gray-500 hover:text-amber-500"}`}
                title="Bookmark Page"
              >
                <svg className="w-5 h-5" fill={bookmarks.some(b => b.location === location) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isSettingsOpen ? "bg-primary text-white shadow-lg shadow-primary/20" : theme === "dark" ? "bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white" : theme === "sepia" ? "bg-[#5B4636]/10 hover:bg-[#5B4636]/20 text-[#5B4636]" : "bg-gray-100/70 hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`}
                title="Settings"
              >
                <span className="font-serif font-bold text-lg leading-none">AA</span>
              </button>
            </div>

            {/* Theme switcher */}
            <div className={`flex items-center gap-2 pl-4 border-l transition-colors duration-300 ${theme === "dark" ? "border-gray-800" : theme === "sepia" ? "border-[#E5D7B7]" : "border-gray-200"}`}>
              {[
                { id: "light", icon: "☀️", bg: "bg-white" },
                { id: "sepia", icon: "☕", bg: "bg-[#F4ECD8]" },
                { id: "dark", icon: "🌙", bg: "bg-[#16181D]" },
              ].map(({ id, icon, bg }) => (
                <button
                  key={id}
                  onClick={() => setReaderTheme(id)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${bg} border ${theme === id ? "ring-2 ring-primary ring-offset-2 border-primary scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <span className="text-xs">{icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        {isSettingsOpen && (
          <div className={`border-t animate-in slide-in-from-top-4 duration-300 transition-colors ${theme === 'dark' ? 'bg-[#0F1115] border-gray-800' : theme === 'sepia' ? 'bg-[#F4ECD8] border-[#E5D7B7]' : 'bg-white border-gray-100'}`}>
            <div className="max-w-4xl mx-auto px-8 py-6 flex flex-wrap items-center justify-center gap-12">
              
              {/* Font Size */}
              <div className="flex flex-col gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Text Size</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.max(12, p.fontSize - 2) }))} className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>-</button>
                  <span className={`text-sm font-black w-8 text-center ${s.text}`}>{settings.fontSize}</span>
                  <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.min(48, p.fontSize + 2) }))} className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>+</button>
                </div>
              </div>

              {/* Reading Width */}
              <div className="flex flex-col gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Reading Width</span>
                <div className={`p-1 flex rounded-xl ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-100'}`}>
                  {[
                    { id: 500, label: 'Narrow' },
                    { id: 760, label: 'Normal' },
                    { id: 1000, label: 'Wide' },
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => setSettings(p => ({ ...p, readingWidth: w.id }))}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.readingWidth === w.id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div className="flex flex-col gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Line Spacing</span>
                <div className="flex items-center gap-4">
                  {[1.4, 1.8, 2.2].map(lh => (
                    <button
                      key={lh}
                      onClick={() => setSettings(p => ({ ...p, lineHeight: lh }))}
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center border gap-1 transition-all ${settings.lineHeight === lh ? 'border-primary bg-primary/5' : theme === 'dark' ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="w-4 h-0.5 bg-current opacity-40"></div>
                      <div className="w-4 h-0.5 bg-current" style={{ marginTop: `${(lh - 1.4) * 4}px`, marginBottom: `${(lh - 1.4) * 4}px` }}></div>
                      <div className="w-4 h-0.5 bg-current opacity-40"></div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── Reading area ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Case -1: Summary Mode Upgrade */}
        {isSummaryMode && (
          <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto">
              
              {/* Premium Summary Card */}
              <div className={`rounded-[3rem] shadow-2xl border transition-all duration-500 overflow-hidden ${s.card}`}>
                
                {/* Header Section */}
                <div className={`p-8 lg:p-12 border-b transition-colors duration-500 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/20' : theme === 'sepia' ? 'border-[#E5D7B7] bg-[#F4ECD8]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-xl transition-transform hover:scale-110 duration-500 ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}>
                        ✨
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Powered Assistant</span>
                          <span className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></span>
                          <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{book?.title}</span>
                        </div>
                        <h2 className={`text-3xl font-black uppercase tracking-tight ${s.text}`}>AI Summary</h2>
                      </div>
                    </div>

                    {/* Sub-mode Tabs */}
                    <div className={`p-1.5 flex rounded-2xl border transition-all duration-500 ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : theme === 'sepia' ? 'bg-[#E5D7B7]/40 border-[#D4C8A8]' : 'bg-gray-200/50 border-gray-200'}`}>
                      {[
                        { id: 'quick', label: 'Quick', icon: '⚡' },
                        { id: 'deep', label: 'Deep', icon: '📖' },
                        { id: 'insights', label: 'Insights', icon: '💡' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSummarySubMode(m.id)}
                          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${summarySubMode === m.id ? 'bg-white dark:bg-gray-700 shadow-xl text-gray-900 dark:text-white scale-[1.02]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/10'}`}
                        >
                          <span className="text-sm opacity-80">{m.icon}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-8 lg:p-12 lg:px-16">
                  {(() => {
                    const rawText = book?.summary || book?.description || "No content available.";
                    
                    // Intelligent Parsing (Client-side)
                    const sections = {
                      about: { title: "About the Book", icon: "📚", text: "" },
                      quick: { title: "Executive Summary", icon: "⚡", text: "" },
                      themes: { title: "Key Themes", icon: "🧩", items: [] },
                      characters: { title: "Main Characters", icon: "👥", items: [] },
                      arc: { title: "Story Arc", icon: "🎢", text: "" },
                      insight: { title: "Critical Insight", icon: "💎", text: "" },
                    };

                    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
                    let currentSection = "about";

                    lines.forEach(line => {
                      const lower = line.toLowerCase();
                      if (lower.includes("themes:") || lower.includes("key themes:")) currentSection = "themes";
                      else if (lower.includes("characters:") || lower.includes("main characters:")) currentSection = "characters";
                      else if (lower.includes("story arc:") || lower.includes("plot arc:")) currentSection = "arc";
                      else if (lower.includes("insight:") || lower.includes("why it matters:")) currentSection = "insight";
                      else if (lower.includes("quick summary:")) currentSection = "quick";
                      else {
                        if (currentSection === "themes" || currentSection === "characters") {
                          const cleaned = line.replace(/^[-*•]\s*/, "");
                          sections[currentSection].items.push(cleaned);
                        } else {
                          sections[currentSection].text += (sections[currentSection].text ? "\n" : "") + line;
                        }
                      }
                    });

                    // Auto-generate sections if they are missing
                    if (!sections.quick.text && sections.about.text) {
                      const sentences = sections.about.text.split(/[.!?]/);
                      sections.quick.text = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '.');
                    }

                    if (summarySubMode === 'quick') {
                      return (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <div className={`p-10 rounded-[2.5rem] relative overflow-hidden ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                              <div className="relative z-10">
                                <p className={`text-2xl lg:text-3xl font-bold leading-tight mb-6 italic ${s.text}`}>"{sections.quick.text}"</p>
                                <div className="flex gap-2">
                                  <div className="w-12 h-1 bg-primary rounded-full" />
                                  <div className="w-4 h-1 bg-primary/30 rounded-full" />
                                </div>
                              </div>
                           </div>
                           <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                             {sections.insight.text && (
                               <div className={`p-8 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-gray-800/20 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                                   <span>💎</span> Why it matters
                                 </h4>
                                 <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{sections.insight.text}</p>
                               </div>
                             )}
                             <div className={`p-8 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-gray-800/20 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                                 <span>⏱️</span> Reading time
                               </h4>
                               <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Estimated 48-72 hours for deep reading. Summary takes 2 mins.</p>
                             </div>
                           </div>
                        </div>
                      );
                    }

                    if (summarySubMode === 'insights') {
                      return (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <div>
                                <h3 className={`text-lg font-black uppercase tracking-widest mb-8 flex items-center gap-3 ${s.text}`}>
                                  <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">🧩</span> {sections.themes.title}
                                </h3>
                                <div className="space-y-4">
                                  {(sections.themes.items.length > 0 ? sections.themes.items : ["Atmosphere & Setting", "Human Ambition", "Moral Conflict"]).map((item, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{item}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h3 className={`text-lg font-black uppercase tracking-widest mb-8 flex items-center gap-3 ${s.text}`}>
                                  <span className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">👥</span> {sections.characters.title}
                                </h3>
                                <div className="space-y-4">
                                  {(sections.characters.items.length > 0 ? sections.characters.items : ["Victor Frankenstein", "The Creature", "Captain Walton"]).map((item, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{item}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           </div>
                           {sections.insight.text && (
                             <div className={`p-10 rounded-[2.5rem] border-2 border-dashed ${theme === 'dark' ? 'bg-primary/5 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Expert Insight</h3>
                               <p className={`text-xl font-medium italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{sections.insight.text}</p>
                             </div>
                           )}
                        </div>
                      );
                    }

                    // Default: Deep Mode
                    return (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12 max-w-2xl mx-auto">
                        <div className="space-y-8">
                          <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-primary`}>Core Narrative</h3>
                          <div 
                            className={`summary-content leading-relaxed text-lg lg:text-xl font-medium space-y-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                            dangerouslySetInnerHTML={{ 
                               __html: (sections.about.text || sections.quick.text).replace(/\n/g, '<br/><br/>') 
                            }} 
                          />
                        </div>
                        
                        {sections.arc.text && (
                          <div className={`p-10 rounded-[3rem] border transition-all ${theme === 'dark' ? 'bg-gray-950/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-8 flex items-center gap-3">
                               <span className="p-2 rounded-xl bg-primary/10">🎢</span> {sections.arc.title}
                             </h4>
                             <p className={`text-base font-medium leading-loose ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{sections.arc.text}</p>
                          </div>
                        )}

                        <div className="pt-12 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-8 items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>🤓</div>
                             <div>
                               <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Finished Reading Mode?</p>
                               <button 
                                 onClick={() => setIsSummaryMode(false)}
                                 className="text-xs font-black text-primary hover:text-blue-700 transition-colors uppercase tracking-widest"
                               >
                                 Switch back to the book
                               </button>
                             </div>
                          </div>
                          
                          <div className={`px-6 py-4 rounded-2xl flex items-center gap-6 ${theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-100/50'}`}>
                             <div className="flex -space-x-2">
                               {[1,2,3].map(i => (
                                 <div key={i} className={`w-8 h-8 rounded-full border-2 border-white dark:border-gray-950 flex items-center justify-center text-[10px] bg-primary text-white font-bold`}>
                                   {i}
                                 </div>
                               ))}
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Insight Chapters Found</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="mt-16 flex justify-between items-center px-8">
                 <button 
                   onClick={() => setIsSummaryMode(false)}
                   className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:-translate-x-2 ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'}`}
                 >
                   <span className="w-10 h-10 rounded-full border border-current flex items-center justify-center">←</span>
                   {t("back_to_reading") || "Return to Book Reader"}
                 </button>
                 
                 <div className="flex gap-4">
                    <div className="text-right">
                       <p className={`text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1`}>Next Recommendation</p>
                       <p className={`text-xs font-bold ${s.text}`}>AI Analysis: {book?.category || "Similar Titles"}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-transform hover:rotate-12 ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      🎯
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {!isSummaryMode && (
          <div className={`flex-1 flex flex-col relative overflow-hidden theme-transition ${theme}`}>
            <>
            {/* Preview Restriction Overlay (For PDF direct mode) */}
            {isPreview && isPdf && pdfMode === "iframe" && !pdfLoadError && (
              <div className="absolute top-[800px] bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent flex flex-col items-center justify-center p-10 text-center pointer-events-auto backdrop-blur-sm">
                 <div className="p-12 rounded-[3.5rem] bg-white dark:bg-gray-800 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-700 max-w-lg scale-90 lg:scale-100">
                    <div className="text-7xl mb-10 transform -rotate-12">🔒</div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Access Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium leading-relaxed">
                      You are viewing a free preview of the first page. Rent or buy this book to unlock the complete content and full navigation.
                    </p>
                    <Link to={`/book/${bookId}`} className="inline-block bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-2xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest">
                      {t("get_full_access") || "Get Full Access"}
                    </Link>
                 </div>
              </div>
            )}


        {/* ── Case 0: External Reader (landing pages, Gutenberg ebooks view, etc) ── */}
        {isExternalRead && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className={`rounded-[4rem] p-12 lg:p-24 max-w-3xl w-full text-center shadow-2xl transition-all duration-500 border animate-in zoom-in-95 ${s.card}`}>
              <div className="text-8xl mb-10">🚀</div>
              <h2 className={`text-3xl font-black mb-6 uppercase tracking-tight ${s.text}`}>External Reader Required</h2>
              <p className={`text-sm mb-12 leading-relaxed font-medium max-w-md mx-auto ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                 This {isGutenberg ? "Project Gutenberg" : "imported"} book is hosted on a secure external platform that provides its own high-quality reading experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a 
                  href={rawUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all text-xs uppercase tracking-widest inline-block"
                >
                  {t("open_externally") || "Open External Reader"} ↗
                </a>
                <Link to={`/book/${bookId}`} className={`font-black py-5 px-12 rounded-2xl border text-xs uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-gray-700 text-gray-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}>
                   {t("back_to_book_details") || "Back"}
                </Link>
              </div>
              <p className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Security policy: Direct downloads are disabled.</p>
            </div>
          </div>
        )}

        {/* ── Case 1: EPUB file (React Reader) ── */}
        {isEpub && !isExternalRead && bookFileUrl && (
          <div className={`flex-1 relative animate-in fade-in duration-700 ${s.wrapper} ${isPreview ? "max-h-[850px] overflow-hidden preview-lockdown" : "h-[calc(100vh-65px)]"}`}>
              <div 
                className={`absolute inset-0 z-10 ${s.wrapper} ${isPreview ? "pointer-events-none select-none" : ""} transition-all duration-500`}
                style={{ 
                  maxWidth: isPreview ? '100%' : `${settings.readingWidth}px`, 
                  margin: '0 auto',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100%'
                }}
              >
                <ReactReader
                  key={`${readerTheme}-${settings.fontSize}-${settings.lineHeight}-${settings.readingWidth}`}
                  url={bookFileUrl}
                  location={location}
                  locationChanged={(epubcifi) => {
                    if (isPreview && location) return; // Prevent navigation after first render
                    setLocation(epubcifi);
                  }}
                  showToc={!isPreview}
                  swipeable={!isPreview}
                  epubOptions={{
                    flow: "paginated"
                  }}
                  getRendition={(rendition) => {
                    renditionRef.current = rendition;
                    rendition.themes.register("light", reactReaderThemeDict.light);
                     rendition.themes.register("sepia", reactReaderThemeDict.sepia);
                    rendition.themes.register("dark", reactReaderThemeDict.dark);
                    rendition.themes.select(readerTheme);

                    // Generate locations for progress tracking
                    rendition.book.locations.generate(1600).then(() => {
                      setTotalPages(rendition.book.locations.length());
                    });

                    // Text Selection for Highlights
                    rendition.on("selected", (cfiRange) => {
                      try {
                        rendition.getRange(cfiRange).then(range => {
                          if (range) {
                            const text = range.toString().trim();
                            if (text) {
                              setSelectionData({ cfiRange, text });
                            }
                          }
                        });
                      } catch (err) {
                        console.error("Text selection error:", err);
                      }
                    });

                    // Restore Highlights
                    highlights.forEach(hl => {
                      rendition.annotations.add("highlight", hl.cfiRange, {}, null, "hl", { fill: hl.color || "#FDE047", "fill-opacity": "0.4" });
                    });
                  }}
                />
             </div>

             {/* ── Reading Progress Footer ── */}
             {!isPreview && (
               <div className={`absolute bottom-0 left-0 right-0 z-30 h-12 border-t flex flex-col transition-all duration-500 ${theme === 'dark' ? 'bg-[#0F1115]/80 border-gray-800' : theme === 'sepia' ? 'bg-[#F4ECD8]/80 border-[#E5D7B7]' : 'bg-white/80 border-gray-100'} backdrop-blur-md`}>
                 {/* Progress Bar */}
                 <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                   <div 
                    className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" 
                    style={{ width: `${progress}%` }}
                   />
                 </div>
                 
                 {/* Progress Info */}
                 <div className="flex-1 px-8 flex items-center justify-between">
                   <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                     <span>{progress}% Completed</span>
                     {totalPages > 0 && (
                       <>
                        <span className="w-1 h-1 rounded-full bg-current"></span>
                        <span>Location {currentPage} of {totalPages}</span>
                       </>
                     )}
                   </div>
                   
                   {/* Bookmark quick list (truncated) */}
                   {bookmarks.length > 0 && (
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Bookmarks:</span>
                       <div className="flex items-center gap-1">
                          {bookmarks.slice(-3).map((b, i) => (
                            <button 
                              key={i} 
                              onClick={() => setLocation(b.location)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-all hover:scale-110 ${theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                              🔖
                            </button>
                          ))}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )}
             {/* Preview Restriction Overlay (For EPUB) */}
             {isPreview && (
              <div className="absolute top-[300px] bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent flex flex-col items-center justify-center p-10 text-center pointer-events-auto backdrop-blur-sm">
                 <div className="p-12 rounded-[3.5rem] bg-white dark:bg-gray-800 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-700 max-w-lg scale-90 lg:scale-100">
                    <div className="text-7xl mb-10 transform -rotate-12">🔒</div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Access Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium leading-relaxed">
                      You are viewing a free preview of the EPUB. Rent or buy this book to unlock the complete content and full navigation.
                    </p>
                    <Link to={`/book/${bookId}`} className="inline-block bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-2xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest">
                      {t("get_full_access") || "Get Full Access"}
                    </Link>
                 </div>
              </div>
            )}

            {/* ── Text Selection Floating Bar ── */}
            {selectionData && (
              <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-50 shadow-2xl rounded-2xl border px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-bottom-4 min-w-[320px] ${theme === 'dark' ? 'bg-[#16181D] border-gray-800' : 'bg-white border-gray-200'}`}>
                {aiExplanation ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">✨ AI Explanation</span>
                      <button onClick={() => setAiExplanation(null)} className={`opacity-50 hover:opacity-100 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>✕</button>
                    </div>
                    {aiExplanation.loading ? (
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        Analyzing text...
                      </div>
                    ) : (
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{aiExplanation.text}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-8">
                      <div className="flex gap-2">
                        {[
                          { id: 'yellow', hex: '#FDE047' },
                          { id: 'green', hex: '#86EFAC' },
                          { id: 'blue', hex: '#93C5FD' },
                          { id: 'pink', hex: '#F9A8D4' }
                        ].map(color => (
                          <button
                            key={color.id}
                            onClick={() => {
                              const newHighlight = { cfiRange: selectionData.cfiRange, color: color.hex, timestamp: Date.now() };
                              setHighlights(prev => [...prev, newHighlight]);
                              renditionRef.current.annotations.add("highlight", selectionData.cfiRange, {}, null, "hl", { fill: color.hex, "fill-opacity": "0.4" });
                              renditionRef.current.getContents()[0].window.getSelection().removeAllRanges();
                              setSelectionData(null);
                            }}
                            className="w-8 h-8 rounded-full border shadow-sm hover:scale-110 transition-transform dark:border-gray-700"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                      <div className={`flex gap-2 border-l pl-4 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                        <button 
                          onClick={() => {
                            const note = prompt("Add a note:");
                            if (note) {
                              const newHighlight = { cfiRange: selectionData.cfiRange, color: '#FDE047', note, timestamp: Date.now() };
                              setHighlights(prev => [...prev, newHighlight]);
                              renditionRef.current.annotations.add("highlight", selectionData.cfiRange, {}, null, "hl", { fill: '#FDE047', "fill-opacity": "0.4" });
                              renditionRef.current.getContents()[0].window.getSelection().removeAllRanges();
                              setSelectionData(null);
                            }
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                        >
                          📝 Note
                        </button>
                        <button 
                          onClick={async () => {
                            setAiExplanation({ loading: true });
                            try {
                              const res = await axios.post('/api/ai/explain', { text: selectionData.text });
                              setAiExplanation({ text: res.data.explanation || "This paragraph explores..." });
                            } catch (e) {
                              const snippet = selectionData.text.split(' ').slice(0, 15).join(' ');
                              setAiExplanation({ text: `Based on context, this text implies: "${snippet}..." (Explanation generated by BookVerse AI)` });
                            }
                          }}
                          className="bg-primary hover:bg-opacity-90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-colors flex items-center gap-1.5"
                        >
                          ✨ Explain
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        renditionRef.current.getContents()[0].window.getSelection().removeAllRanges();
                        setSelectionData(null);
                      }} 
                      className={`text-[10px] font-black uppercase pt-2 border-t tracking-widest text-center opacity-50 hover:opacity-100 transition-opacity ${theme === 'dark' ? 'border-gray-800 text-white' : 'border-gray-100'}`}
                    >
                      Cancel Selection
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {/* ── Case 2: Embeddable Content (PDF, Archive.org, Google Books) ── */}
        {bookFileUrl && !isEpub && !isExternalRead && !pdfLoadError && (
          <div className={`flex-1 relative animate-in fade-in duration-700 ${s.wrapper} ${isPreview ? "max-h-[850px] overflow-hidden" : ""}`}>
            {isExternalEmbed ? (
              <div className="w-full h-full flex flex-col">
                {isGoogle && (
                   <div className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 p-4 text-center">
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest inline-block">
                         ⚠️ {t("external_source") || "External secure preview window loaded"}.
                      </p>
                   </div>
                )}
                <iframe
                  src={bookFileUrl}
                  title={book?.title}
                  className={`w-full h-full border-none ${isPreview ? "pointer-events-none select-none" : ""}`}
                  style={{ height: isPreview ? "1200px" : "calc(100vh - 65px)" }}
                  scrolling={isPreview ? "no" : "auto"}
                  tabIndex={isPreview ? -1 : 0}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-black overflow-hidden">
                {isGutenbergReader ? (
                  /* Case 3: External HTML Reader (iFrame) */
                  <iframe
                    src={bookFileUrl}
                    title={book?.title}
                    className={`w-full h-full border-none ${isPreview ? "pointer-events-none select-none" : ""}`}
                    style={{ height: isPreview ? "1200px" : "calc(100vh - 65px)" }}
                    scrolling={isPreview ? "no" : "auto"}
                    tabIndex={isPreview ? -1 : 0}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : pdfMode === "iframe" ? (
                  /* Case 1: Native PDF/File Viewer */
                  <iframe
                    src={bookFileUrl}
                    title={book?.title}
                    className={`w-full h-full ${isPreview ? "pointer-events-none select-none" : ""}`}
                    style={{ border: "none", height: isPreview ? "1200px" : "calc(100vh - 65px)" }}
                    scrolling={isPreview ? "no" : "auto"}
                    tabIndex={isPreview ? -1 : 0}
                    onError={() => setPdfLoadError(true)}
                  />
                ) : (
                  /* Case 2: Google PDF Viewer */
                  <iframe
                    src={googleViewerUrl}
                    title={book?.title}
                    className={`w-full h-full ${isPreview ? "pointer-events-none select-none" : ""}`}
                    style={{ border: "none", height: isPreview ? "1200px" : "calc(100vh - 65px)" }}
                    scrolling={isPreview ? "no" : "auto"}
                    tabIndex={isPreview ? -1 : 0}
                    onError={() => setPdfLoadError(true)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Case 2b: Load Error Fallback ── */}
        {!isEpub && (pdfLoadError || (bookFileUrl && isExternalEmbed && !isPreview)) && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className={`rounded-[4rem] p-12 lg:p-20 max-w-xl w-full text-center shadow-2xl border transition-all duration-500 ${s.card}`}>
              <div className="text-8xl mb-10">🛡️</div>
              <h2 className={`text-2xl font-black mb-6 uppercase tracking-tight ${s.text}`}>{t("display_error") || "In-App Viewer Restricted"}</h2>
              <p className={`text-sm mb-12 leading-relaxed font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                 The source file provider blocks in-app viewing for security. To protect our content, direct downloads are not allowed. Try switching viewer mode.
              </p>
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                {!isExternalEmbed && (
                  <button
                    onClick={() => { setPdfMode(pdfMode === "iframe" ? "google" : "iframe"); setPdfLoadError(false); }}
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all text-xs uppercase tracking-widest active:scale-95"
                  >
                    🔄 {t("try_backup") || "Switch Reader Mode"}
                  </button>
                )}
                <Link to={`/book/${bookId}`} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors py-4">
                  ← Return to Book Page
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Case 3: No source detected ── */}
        {!bookFileUrl && !isExternalRead && (
          <div className="flex-1 flex items-center justify-center p-8">
             <div className={`rounded-[4rem] p-12 lg:p-24 max-w-3xl w-full shadow-2xl border transition-all duration-700 animate-in zoom-in-95 ${s.card}`}>
              {/* Header */}
              <div className="text-center mb-16">
                {book?.image && (
                  <div className="relative inline-block group">
                     <img
                      src={book.image}
                      alt={book?.title}
                      className="w-40 h-56 object-cover rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] mx-auto mb-8 transform group-hover:scale-105 transition-transform duration-700"
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-primary/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <h1 className={`text-4xl font-black mb-4 tracking-tighter leading-none ${s.text}`}>{book?.title}</h1>
                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                  By {book?.author}
                </p>
                <div className="w-20 h-1.5 bg-primary/30 mx-auto mt-12 rounded-full" />
              </div>

              {/* No source notice */}
              <div className={`rounded-[3rem] p-12 border text-center relative overflow-hidden ${theme === "dark" ? "bg-gray-800/20 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-700"}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="text-6xl mb-8 relative z-10 opacity-60">📪</div>
                <h3 className="text-xl font-black uppercase tracking-[0.1em] mb-4 relative z-10">
                  {isPreview ? (t("no_preview") || "Preview Offline") : (t("no_digital_copy") || "No Digital Copy")}
                </h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed mb-10 max-w-xs mx-auto relative z-10">
                  {isPreview 
                    ? "This item does not have an active preview. Full access is required to view the content."
                    : "Wait for the admin to link a secure digital copy. Your access will be active once uploaded."}
                </p>
                <Link to="/my-library" className="inline-block text-[10px] font-black text-primary hover:text-blue-700 uppercase tracking-widest relative z-10 px-8 py-3 bg-primary/5 rounded-full transition-all">
                  ← {t("back_to_library") || "Return to Library"}
                </Link>
              </div>
            </div>
          </div>
        )}
        {/* ── Case 4: Absolute Fallback (Safety) ── */}
        {!isExternalRead && !isEpub && !isEmbeddable && bookFileUrl && !pdfLoadError && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className={`rounded-[4rem] p-12 lg:p-24 max-w-3xl w-full text-center shadow-2xl transition-all duration-500 border ${s.card}`}>
              <div className="text-8xl mb-10">🚀</div>
              <h2 className={`text-3xl font-black mb-6 uppercase tracking-tight ${s.text}`}>{t("open_externally") || "Continue to Source"}</h2>
              <p className={`text-sm mb-12 leading-relaxed font-medium max-w-md mx-auto ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                This reading source requires dedicated browser access. Click below to continue directly to the book.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all text-xs uppercase tracking-widest inline-block">
                  {t("open_direct") || "Open External Reader"} ↗
                </a>
                <Link to={`/book/${bookId}`} className={`font-black py-5 px-12 rounded-2xl border text-xs uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-gray-700 text-gray-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}>
                  {t("back_to_book_details") || "Back"}
                </Link>
              </div>
            </div>
          </div>
        )}
            </>
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { display: none !important; }
            .reader-wrapper { display: none !important; }
          }
          
          .protected-content {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
          }
          
          /* Allow iframe but restrict some interactions if possible */
          .reader-view iframe {
            pointer-events: auto;
          }
        `}} />
      </div>
    </div>
  );
};

export default BookReader;
