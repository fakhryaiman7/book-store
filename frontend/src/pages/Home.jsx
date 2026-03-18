import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../components/FavoriteButton";

/* ─── Helpers ─── */
const fmt = (v, t) => `${v || 0} ${t ? t("currency") : "EGP"}`;

const CATEGORIES = [
  { label: "cat_all",     icon: "✦",  value: "" },
  { label: "cat_fantasy", icon: "🧙",  value: "Fantasy" },
  { label: "cat_mystery", icon: "🔍",  value: "Mystery" },
  { label: "cat_romance", icon: "❤️",  value: "Romance" },
  { label: "cat_history", icon: "🏛️",  value: "History" },
  { label: "cat_scifi",   icon: "🚀",  value: "Sci-Fi" },
  { label: "cat_science", icon: "🔬",  value: "Science" },
  { label: "cat_health",  icon: "🏥",  value: "Health" },
];

const BOOKS_PER_PAGE = 8;

/* ─── BookCard ─── */
const HomeBookCard = ({ book }) => {
  const { t } = useTranslation();
  const rentalPrice   = book.rentalPrice   || book.rental_price   || book.pricePerDay || book.price_per_day || 0;
  const purchasePrice = book.purchasePrice || book.purchase_price || 0;
  const discountPrice = book.discountPrice || book.discount_price || null;
  const inStock       = (book.countInStock ?? book.count_in_stock ?? 0) > 0;

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-transparent dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Cover */}
      <Link to={`/book/${book._id || book.id}`} className="relative overflow-hidden bg-primary-pale dark:bg-gray-800 block" style={{ height: "240px" }}>
        <img
          src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {book.category && (
          <span className="absolute top-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-primary dark:text-primary-light text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            {t(`cat_${book.category.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) !== `cat_${book.category.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` ? t(`cat_${book.category.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) : book.category}
          </span>
        )}
        <div className="absolute top-3 right-3 z-10 transition-transform duration-300 group-hover:scale-110">
          <FavoriteButton bookId={book.id || book._id} className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-lg" />
        </div>
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-50 text-white text-xs font-bold px-3 py-1 rounded-full">{t("out_of_stock") || "Out of Stock"}</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/book/${book._id || book.id}`}>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-gray-400 text-xs font-medium mb-3">by {book.author}</p>

        {book.description && (
          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2 mb-4 flex-grow">
            {book.description}
          </p>
        )}

        {/* Pricing & Actions */}
        <div className="border-t border-gray-50 dark:border-gray-800 pt-3 mt-auto space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{t("rent")}</p>
              <p className="text-primary dark:text-primary-light font-black text-sm">{fmt(rentalPrice, t)}</p>
            </div>
            {purchasePrice > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{t("buy")}</p>
                <p className="text-green-600 dark:text-green-400 font-black text-sm">{fmt(discountPrice && discountPrice < purchasePrice ? discountPrice : purchasePrice, t)}</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {(book.read_mode === "full_read" || book.read_mode === "preview") && (
              <Link 
                to={`/reader/${book._id || book.id}${book.read_mode === 'preview' ? '?preview=true' : ''}`}
                className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-primary hover:text-white hover:border-primary text-center transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {book.read_mode === "full_read" ? "📖 " + t("read_now") : "🔍 " + t("preview")}
              </Link>
            )}
            <Link 
              to={`/book/${book._id || book.id}`}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase text-center shadow-lg shadow-primary/10 hover:bg-opacity-90 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              🛒 {t("get_access") || "Details"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Home Component ─── */
const Home = () => {
  const [books,       setBooks]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("");
  const [sortBy,      setSortBy]      = useState("default");
  const [page,        setPage]        = useState(1);
  /* Parallax Mouse Effect State */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX - window.innerWidth / 2) / 25,
        y: (e.clientY - window.innerHeight / 2) / 25,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  /* Fetch books */
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await axios.get("/api/books");
        setBooks(data);
        setFiltered(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  /* Filter + sort */
  useEffect(() => {
    let result = [...books];
    if (category) result = result.filter((b) => b.category?.toLowerCase() === category.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "price-asc") result.sort((a, b) => (a.rental_price || a.price_per_day || 0) - (b.rental_price || b.price_per_day || 0));
    if (sortBy === "price-desc") result.sort((a, b) => (b.rental_price || b.price_per_day || 0) - (a.rental_price || a.price_per_day || 0));
    if (sortBy === "title") result.sort((a, b) => a.title?.localeCompare(b.title));
    setFiltered(result);
    setPage(1);
  }, [books, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / BOOKS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * BOOKS_PER_PAGE, page * BOOKS_PER_PAGE);

  /* ── RENDER ── */
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen transition-colors duration-200">

      {/* ═══════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════ */}
      <section className="relative min-h-[70vh] flex items-center pt-12 pb-20 md:pt-16 md:pb-32 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-500">
        {/* Subtle Background Gradient and Glow */}
        <div className="absolute inset-0 bg-white dark:bg-[#020617] pointer-events-none transition-colors duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-white dark:from-[#020617] dark:via-[#0f172a] dark:to-[#1e1b4b] opacity-100" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[150px] opacity-40 rounded-full" />
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center px-6 py-2 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-sm mb-10 animate-[fadeUp_0.8s_ease-out] transition-colors">
             <span className="text-lg md:text-xl font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500">
               {t("welcome_message")}
             </span>
          </div>

          {/* Headline */}
          <h1 className={`text-6xl sm:text-7xl lg:text-[5.5rem] font-black text-gray-900 dark:text-white leading-[1.05] mb-8 animate-fade-in delay-75 ${isRtl ? "" : "tracking-tighter"}`}>
             {t("hero_title")}
          </h1>

          {/* Description */}
          <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-2xl max-w-2xl mb-12 animate-fade-in delay-150 leading-relaxed font-medium">
            {t("hero_subtitle")}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-6 mb-24 animate-fade-in delay-300">
             <a 
               href="#books" 
               className="group px-12 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary-light hover:scale-105 transition-all duration-300"
             >
               {t("hero_cta_explore")}
             </a>
             <Link 
               to="/register" 
               className="group px-12 py-5 bg-white dark:bg-transparent text-gray-900 dark:text-white font-black rounded-2xl border-2 border-gray-100 dark:border-white/10 hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-white/5 hover:scale-105 transition-all duration-300"
             >
               {t("hero_cta_signup")}
             </Link>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-20 animate-fade-in delay-500">
             <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">5K+</span>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-3">📚 {t("books_available")}</span>
             </div>
             <div className="w-px h-12 bg-gray-100 dark:bg-white/10 hidden md:block" />
             <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">10K+</span>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-3">👥 {t("happy_readers")}</span>
             </div>
             <div className="w-px h-12 bg-gray-100 dark:bg-white/10 hidden md:block" />
             <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">50+</span>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-3">📂 {t("categories_count")}</span>
             </div>
          </div>
        </div>

        {/* Minimal Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
          .delay-75 { animation-delay: 0.15s; }
          .delay-150 { animation-delay: 0.3s; }
          .delay-300 { animation-delay: 0.45s; }
          .delay-500 { animation-delay: 0.6s; }
        `}} />
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="border-t border-gray-50 dark:border-gray-900 bg-white dark:bg-gray-950 py-8" id="books">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 border-2 active:scale-95 ${
                  category === cat.value
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:border-primary/40 hover:text-primary dark:hover:text-primary shadow-sm"
                }`}
              >
                <span className={`text-base transition-transform duration-300 ${category === cat.value ? "scale-110" : "group-hover:scale-110"}`}>{cat.icon}</span>
                <span>{t(cat.label)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEARCH BAR ─── */}
      <section className="bg-gray-50/50 dark:bg-gray-900/20 py-6 border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text" placeholder={t("search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
              />
            </div>
            <select
              value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-5 py-3.5 text-sm font-semibold text-gray-600 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="default">{t("sort_default") || "Sort: Default"}</option>
              <option value="title">Title A–Z</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─── GRID ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">
          {category ? (
            isRtl 
              ? `${t("books_label")} ${t("cat_" + category.replace(/\s+/g, '').toLowerCase())}` 
              : `${t("cat_" + category.replace(/\s+/g, '').toLowerCase())} ${t("books_label")}`
          ) : (t("all_books") || "All Books")}
        </h2>
        {loading ? (
          <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginated.map((b) => <HomeBookCard key={b.id || b._id} book={b} />)}
          </div>
        )}
      </section>

      {/* ─── PAGINATION ─── */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pb-16">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-3 rounded-full border border-gray-200 dark:border-gray-800 dark:text-white disabled:opacity-20 translate-x-0 rtl:-scale-x-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i+1} onClick={() => setPage(i+1)}
              className={`w-10 h-10 rounded-full text-sm font-bold ${page === i+1 ? "bg-primary text-white" : "dark:text-gray-400"}`}
            >
              {i+1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-3 rounded-full border border-gray-200 dark:border-gray-800 dark:text-white disabled:opacity-20 rtl:-scale-x-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
