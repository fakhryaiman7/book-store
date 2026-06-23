import { useState, useEffect, useRef, useMemo } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";

const AdminBooks = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const selectAllRef = useRef(null);

  const emptyForm = useMemo(() => ({
    title: "", author: "", category: "Fiction", description: "",
    image: "", price_per_day: "", rental_price: "", purchase_price: "", discount_price: "", count_in_stock: "999999",
    isbn: "", published_year: new Date().getFullYear().toString(), language: "English", pages: "",
    book_file_url: "",
    preview_file_url: "",
    read_mode: "metadata",
    available_for_sale: true, available_for_rent: true,
  }), []);

  const [form, setForm] = useState(emptyForm);

  const CATEGORIES = useMemo(() => [
    { label: t("cat_fiction") || "Fiction", value: "Fiction" },
    { label: t("cat_children") || "Children", value: "Children" },
    { label: t("cat_health") || "Health", value: "Health" },
    { label: t("cat_academic") || "Academic", value: "Academic" },
    { label: t("cat_business") || "Business", value: "Business" },
    { label: t("cat_religious") || "Religious", value: "Religious" },
  ], [t]);

  const LANGUAGES = useMemo(() => [
    { label: t("lang_arabic") || "Arabic", value: "Arabic" },
    { label: t("lang_english") || "English", value: "English" },
  ], [t]);

  // --- Book file (PDF/EPUB) upload state ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // --- Cover image upload state ---
  const [selectedCover, setSelectedCover] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState(null);
  const [coverUploadSuccess, setCoverUploadSuccess] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const coverInputRef = useRef(null);

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase.from("books").select("*").order("created_at", { ascending: false });
    
    if (!user?.isAdmin && user?.isAuthor) {
      query = query.eq("user_id", user._id || user.id);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBooks(data || []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, []);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedBookIds.length > 0 && selectedBookIds.length < books.length;
    }
  }, [selectedBookIds, books]);

  // Reset all upload state whenever the modal opens
  const resetFileState = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedCover(null);
    setCoverUploadError(null);
    setCoverUploadSuccess(false);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setError(null); setShowAdvanced(false); resetFileState(); setShowModal(true); };
  const openEdit = (book) => {
    setForm({
      title: book.title, author: book.author, category: book.category || "Fiction",
      description: book.description, image: book.image || "",
      price_per_day: book.price_per_day, rental_price: book.rental_price || "",
      purchase_price: book.purchase_price || "",
      discount_price: book.discount_price || "",
      count_in_stock: book.count_in_stock, isbn: book.isbn || "",
      published_year: book.published_year || "", language: book.language || "English",
      pages: book.pages || "", book_file_url: book.book_file_url || "",
      preview_file_url: book.preview_file_url || "",
      read_mode: book.read_mode || "metadata",
      available_for_sale: book.available_for_sale ?? true,
      available_for_rent: book.available_for_rent ?? true,
    });
    setEditId(book.id);
    setError(null);
    setShowAdvanced(false);
    resetFileState();
    setShowModal(true);
  };

  // Cover image upload
  const ALLOWED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
  const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGE_BYTES = 200 * 1024; // 200 KB

  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    setCoverUploadError(null);
    setCoverUploadSuccess(false);
    setSelectedCover(null);
    setCoverPreview(null);
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext) || !ALLOWED_IMAGE_MIME.includes(file.type)) {
      setCoverUploadError("Invalid type. Please select a JPG, PNG, or WEBP image.");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setCoverUploadError("Cover image must be 200KB or smaller.");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setSelectedCover(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadCoverImage = async () => {
    if (!selectedCover) return;
    setUploadingCover(true);
    setCoverUploadError(null);
    try {
      const ext = selectedCover.name.split(".").pop().toLowerCase();
      const safeName = `cover-${Date.now()}.${ext}`;
      const filePath = `covers/${safeName}`;
      const { error: uploadErr } = await supabase.storage.from("book-covers").upload(filePath, selectedCover);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(filePath);
      setForm((prev) => ({ ...prev, image: urlData.publicUrl }));
      setCoverUploadSuccess(true);
    } catch (err) {
      setCoverUploadError(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  // --------------- Book file upload ---------------
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setUploadError(null);
    setUploadSuccess(false);
    setSelectedFile(null);
    if (!file) return;
    setSelectedFile(file);
  };

  const uploadBookFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ext = selectedFile.name.split(".").pop().toLowerCase();
      const safeName = `book-${Date.now()}.${ext}`;
      const filePath = `books/${ext}/${safeName}`;
      const { error: uploadErr } = await supabase.storage.from("book-files").upload(filePath, selectedFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("book-files").getPublicUrl(filePath);
      setForm((prev) => ({ ...prev, book_file_url: urlData.publicUrl }));
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      title: form.title, 
      author: form.author, 
      category: form.category,
      description: form.description, 
      image: form.image,
      pricePerDay: parseFloat(form.price_per_day || 0),
      purchasePrice: parseFloat(form.purchase_price || 0),
      discountPrice: form.discount_price ? parseFloat(form.discount_price) : null,
      countInStock: parseInt(form.count_in_stock || 0),
      isbn: form.isbn, 
      published_year: parseInt(form.published_year) || null,
      language: form.language,      
      pages: parseInt(form.pages) || null,
      book_file_url: form.book_file_url,
      preview_file_url: form.preview_file_url,
      read_mode: form.read_mode,
      available_for_sale: form.available_for_sale,
      available_for_rent: form.available_for_rent,
    };

    try {
      if (editId) {
        await axios.put(`/api/admin/books/${editId}`, payload);
      } else {
        await axios.post("/api/admin/books", payload);
      }
      setSuccess(t("saved_success") || "Saved successfully!");
      setShowModal(false);
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/admin/books/${deleteId}`);
      setSuccess(t("deleted_success") || "Book deleted!"); 
      setSelectedBookIds(prev => prev.filter(id => id !== deleteId));
      fetchBooks(); 
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setDeleteId(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleBulkDelete = async () => {
    if (selectedBookIds.length === 0) return;
    if (!window.confirm(t("confirm_bulk_delete", { count: selectedBookIds.length }) || `Are you sure you want to delete ${selectedBookIds.length} books?`)) return;

    setIsBulkDeleting(true);
    const { error: err } = await supabase.from("books").delete().in("id", selectedBookIds);
    
    if (!err) {
      setSuccess(t("bulk_deleted_success", { count: selectedBookIds.length }) || `${selectedBookIds.length} books deleted successfully!`);
      setSelectedBookIds([]);
      fetchBooks();
    } else {
      setError(err.message);
    }
    
    setIsBulkDeleting(false);
    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  const toggleSelect = (id) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBookIds(books.map(b => b.id));
    } else {
      setSelectedBookIds([]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col md:flex-row transition-colors duration-200">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 animate-in slide-in-from-left duration-500">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t("manage_books") || "Manage Books"}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{books.length} {t("books_in_catalog") || "books in catalog"}</p>
          </div>
          <button onClick={openAdd} className="bg-primary text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all active:scale-95 flex items-center space-x-2 rtl:space-x-reverse text-sm uppercase tracking-widest">
            <span>+</span><span>{t("add_book") || "Add Book"}</span>
          </button>
        </div>

        {success && <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 p-4 rounded-xl shadow-sm font-bold text-sm animate-in slide-in-from-top">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-xl shadow-sm font-bold text-sm animate-in slide-in-from-top">{error}</div>}

        {selectedBookIds.length > 0 && (
          <div className="bg-primary/5 dark:bg-primary/20 border border-primary/20 p-4 rounded-[1.5rem] flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary/20">{selectedBookIds.length}</span>
              <p className="text-sm font-black text-primary dark:text-primary-light uppercase tracking-tight">{t("books_selected") || "Books Selected"}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedBookIds([])}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-4 py-2"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="bg-red-500 text-white font-black py-2.5 px-6 rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                {isBulkDeleting ? t("deleting") || "Deleting..." : (t("delete_selected") || "Delete Selected")}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("loading") || "Loading..."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                  <tr>
                    <th className="px-6 py-4 text-left w-10">
                      <input 
                        type="checkbox" 
                        ref={selectAllRef}
                        checked={books.length > 0 && selectedBookIds.length === books.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 focus:ring-primary text-primary transition-all cursor-pointer"
                      />
                    </th>
                    {[t("col_cover")||"Cover", t("col_title")||"Title", t("col_author")||"Author", t("col_cat")||"Category", t("col_rent")||"Rent", t("col_buy")||"Buy", t("col_actions")||"Actions"].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left rtl:text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {books.map(book => {
                    const isSelected = selectedBookIds.includes(book.id);
                    return (
                      <tr key={book.id} className={`${isSelected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-gray-50/50 dark:hover:bg-gray-800/40"} transition-colors group cursor-default`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelect(book.id)}
                            className="w-4 h-4 rounded border-gray-300 focus:ring-primary text-primary transition-all cursor-pointer"
                          />
                        </td>
                      <td className="px-6 py-4"><img src={book.image || ""} alt="" className="w-10 h-14 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform" /></td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[180px] truncate">{book.title}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">{book.author}</td>
                      <td className="px-6 py-4"><span className="bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {t(`cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) !== `cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` 
                          ? t(`cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) 
                          : book.category}
                      </span></td>
                      <td className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-300">{parseFloat(book.price_per_day).toFixed(0)} {t("currency")}</td>
                      <td className="px-6 py-4 text-xs font-black text-gray-900 dark:text-white">{parseFloat(book.purchase_price).toFixed(0)} {t("currency")}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(book)} className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(book.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-800">
            <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-10">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editId ? t("edit_book") : t("add_new_book")}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_title") || "Book Title"}</label>
                  <input required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none dark:text-white transition-all font-bold"
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_category") || "Category"}</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none dark:text-white font-bold appearance-none cursor-pointer"
                    value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_author") || "Author"}</label>
                  <input required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary outline-none dark:text-white transition-all font-bold"
                    value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_purchase_price") || "Purchase Price (EGP)"}</label>
                  <input type="number" required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none font-black text-primary"
                    value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_discount_price") || "Discount Price (Optional)"}</label>
                  <input type="number" className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none font-bold"
                    value={form.discount_price} onChange={e => setForm(p => ({ ...p, discount_price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_rental_price") || "Rental Price (EGP)"}</label>
                  <input type="number" required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none font-black text-primary"
                    value={form.price_per_day} onChange={e => setForm(p => ({ ...p, price_per_day: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_language") || "Language"}</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none dark:text-white font-bold"
                    value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_published_year") || "Published Year"}</label>
                  <input type="number" className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary outline-none dark:text-white transition-all font-bold"
                    value={form.published_year} onChange={e => setForm(p => ({ ...p, published_year: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("form_desc") || "Description"}</label>
                <textarea rows={4} required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm outline-none dark:text-white font-medium"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              {/* Upload Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t("form_cover") || "Cover Image"}</label>
                  <div className="relative group overflow-hidden w-24 h-32 bg-white dark:bg-gray-800 rounded-xl mb-4 shadow-inner border dark:border-gray-700">
                    <img src={coverPreview || form.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100"} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => coverInputRef.current.click()} className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  <input type="file" ref={coverInputRef} onChange={handleCoverSelect} className="hidden" accept="image/*" />
                  {selectedCover && (
                    <button type="button" onClick={uploadCoverImage} className="text-[10px] font-black uppercase text-primary tracking-widest hover:underline disabled:opacity-50" disabled={uploadingCover}>
                      {uploadingCover ? "..." : t("btn_upload") || "Upload Now"}
                    </button>
                  )}
                  {form.image && !selectedCover && <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">✓ {t("ready")||"READY"}</span>}
                </div>

                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[140px]">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t("form_file") || "Book File (PDF/EPUB)"}</label>
                  <button type="button" onClick={() => fileInputRef.current.click()} className={`text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl border-2 transition-all ${form.book_file_url ? "bg-green-50 border-green-500 text-green-600" : "bg-white dark:bg-gray-800 border-dashed border-gray-200 dark:border-gray-700"}`}>
                    {form.book_file_url ? "✓ File Linked" : t("btn_choose_file") || "Choose File"}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.epub" />
                  {selectedFile && (
                    <button type="button" onClick={uploadBookFile} className="text-[10px] font-black uppercase text-primary tracking-widest mt-3 hover:underline disabled:opacity-50" disabled={uploading}>
                      {uploading ? "..." : t("btn_upload") || "Upload File"}
                    </button>
                  )}
                  {form.book_file_url && (
                    <input className="w-full mt-2 bg-transparent text-[10px] text-gray-400 border-none outline-none text-center" value={form.book_file_url} readOnly />
                  )}
                </div>

                <div className="col-span-1 sm:col-span-2 bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("import_policy") || "Digital Access Policy"}</label>
                    <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl shadow-inner">
                      {["metadata", "preview", "full_read", "external_read"].map(m => (
                        <button key={m} type="button" onClick={() => setForm(p => ({ ...p, read_mode: m }))} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${form.read_mode === m ? "bg-primary text-white shadow-md" : "text-gray-400 hover:text-gray-600"}`}>
                          {m.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.read_mode !== "metadata" && (
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                         {["full_read", "external_read"].includes(form.read_mode) ? "Book Source URL (Internal/Link)" : "Preview / Iframe URL"}
                       </label>
                       <input className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-xs outline-none dark:text-white font-bold"
                         placeholder="https://..."
                         value={["full_read", "external_read"].includes(form.read_mode) ? form.book_file_url : form.preview_file_url}
                         onChange={e => setForm(p => ({ ...p, [["full_read", "external_read"].includes(form.read_mode) ? 'book_file_url' : 'preview_file_url']: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-8 px-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={form.available_for_sale} onChange={e => setForm(p => ({ ...p, available_for_sale: e.target.checked }))} className="w-5 h-5 accent-primary rounded-lg" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">{t("for_sale") || "Available for Sale"}</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={form.available_for_rent} onChange={e => setForm(p => ({ ...p, available_for_rent: e.target.checked }))} className="w-5 h-5 accent-primary rounded-lg" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">{t("for_rent") || "Available for Rent"}</span>
                </label>
              </div>

              <div className="space-y-4">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                  {showAdvanced ? "▼" : "▶"} {t("advanced_options") || "Advanced Options (ISBN, Pages)"}
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t("form_isbn") || "ISBN"}</label>
                      <input className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs outline-none dark:text-white font-bold"
                        value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t("form_pages") || "Pages"}</label>
                      <input type="number" className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs outline-none dark:text-white font-bold"
                        value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-10 border-t dark:border-gray-800 sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm -mx-10 px-10">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">{t("btn_cancel") || "Cancel"}</button>
                <button type="submit" disabled={saving} className="px-12 py-4 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 disabled:opacity-50 transition-all">
                  {saving ? "..." : editId ? t("btn_update") : t("btn_create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/10">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-3xl">⚠️</div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{t("are_you_sure") || "Are you sure?"}</h3>
            <p className="text-gray-400 font-medium text-sm mb-10">{t("delete_confirm_msg") || "This action cannot be undone. The book will be permanently deleted."}</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">{t("btn_cancel")||"Cancel"}</button>
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20">{t("btn_delete")||"Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBooks;
