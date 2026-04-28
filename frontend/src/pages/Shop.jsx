import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { supabase } from "../lib/supabase";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../components/FavoriteButton";

/* ─────────────────────────────────── helpers ─── */
const fmt = (v, t) => `${v || 0} ${t ? t("currency") : "EGP"}`;

const BOOKS_PER_PAGE = 12;

/* ─────────────────────────────────── RentModal ─── */
const RentModal = ({ book, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const rentalPrice = book.rentalPrice || book.rental_price || 0;
  const total = rentalPrice * days;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t("rent_modal_title") || "Rent this Book"}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">{book.title}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <img
            src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200"}
            alt={book.title}
            className="w-full h-44 object-cover rounded-2xl mb-6 shadow-md"
          />

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t("select_duration") || "Select Duration"}</label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-2 text-sm font-bold rounded-xl border-2 transition-all ${
                    days === d
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                      : "border-gray-100 dark:border-gray-800 text-gray-400 dark:bg-gray-800/50 hover:border-primary/50"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{t("price_per_day") || "Price/Day"}</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">{fmt(rentalPrice, t)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{t("total") || "Total"}</p>
              <p className="text-xl font-black text-primary">{fmt(total, t)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              {t("cancel") || "Cancel"}
            </button>
            <button
              onClick={() => onConfirm(days, total)}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-opacity-90 transition-all text-sm shadow-xl shadow-primary/20"
            >
              🛒 {t("add_to_cart") || "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── ShopBookCard ─── */
const ShopBookCard = ({ book, access, onBuy, onRent, addedKey }) => {
  const { t } = useTranslation();
  const inStock = (book.countInStock ?? book.count_in_stock ?? 0) > 0;
  
  const rentalPrice   = book.rentalPrice   || book.rental_price   || 0;
  const purchasePrice = book.purchasePrice || book.purchase_price || 0;
  const discountPrice = book.discountPrice || book.discount_price || null;
  const hasDiscount = discountPrice && discountPrice < purchasePrice;
  const actualBuyPrice = hasDiscount ? discountPrice : purchasePrice;

  const bookId = book._id || book.id;
  const isPurchased = access?.access_type === "purchase";
  const isRented    = access?.access_type === "rental" && access?.expires_at && new Date(access.expires_at) > new Date();
  const hasAccess   = isPurchased || isRented;
  const justAddedBuy  = addedKey === `${bookId}_buy`;
  const justAddedRent = addedKey === `${bookId}_rent`;

  const readMode = book.read_mode || "metadata";

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden border border-gray-100/50 dark:border-gray-800 relative">
      {/* ── Cover ── */}
      <Link to={`/book/${bookId}`} className="block relative overflow-hidden bg-gray-100 dark:bg-gray-800 h-52">
        <img
          src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400"; }}
        />
        
        {/* badges overlay */}
        <div className="absolute top-2 left-2 right-2 flex flex-col gap-1 pointer-events-none">
          <div className="flex justify-between items-start">
            <span className="bg-white/90 dark:bg-black/40 backdrop-blur-md text-primary dark:text-primary-light text-[9px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-wider">
              {t(`cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) !== `cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` 
                ? t(`cat_${book.category?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`) 
                : book.category}
            </span>
            {hasAccess && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shadow-md backdrop-blur-md ${isPurchased ? "bg-green-500/90 text-white" : "bg-primary/90 text-white"}`}>
                {isPurchased ? (t("owned") || "Owned") : (t("rented") || "Rented")}
              </span>
            )}
            {!inStock && !hasAccess && (
              <span className="bg-red-500/90 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-md uppercase">
                {t("out_of_stock") || "Out of Stock"}
              </span>
            )}
          </div>
          {/* Favorite Button */}
          <div className="absolute top-2 right-2 pointer-events-auto transition-transform duration-300 group-hover:scale-110">
            <FavoriteButton bookId={bookId} className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-lg" />
          </div>
          {/* Read Mode Badge */}
          <div className="flex">
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md uppercase tracking-tighter ${
              readMode === 'full_read' ? 'bg-green-500/80 text-white' : 
              readMode === 'preview' ? 'bg-blue-500/80 text-white' : 
              'bg-gray-500/80 text-white'
            }`}>
              {readMode === 'full_read' ? 'Full Book' : readMode === 'preview' ? 'Preview' : 'Metadata'}
            </span>
          </div>
        </div>
      </Link>

      {/* ── Info ── */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/book/${bookId}`}>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mb-3">{t("by") || "by"} {book.author}</p>

        {/* ── Prices ── */}
        <div className="flex justify-between items-end bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 mb-4 border border-transparent dark:border-gray-800">
          <div>
            <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-1">{t("rent") || "Rent"}</p>
            <p className="text-primary font-black text-xs">{fmt(rentalPrice, t)}<span className="text-[9px] opacity-60 font-normal">/{t("day") || "day"}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-1">{t("buy") || "Buy"}</p>
            <div className="flex flex-col items-end">
              <p className="text-green-600 dark:text-green-500 font-black text-xs">{fmt(actualBuyPrice, t)}</p>
              {hasDiscount && (
                <p className="text-[10px] text-gray-400 line-through leading-none mt-0.5">{fmt(purchasePrice, t)}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="mt-auto space-y-2">
          {hasAccess ? (
            <Link
              to={`/reader/${bookId}`}
              className="w-full flex items-center justify-center py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-opacity-90 transition-all shadow-md shadow-primary/10"
            >
              {book.read_mode === 'external_read' ? (
                <>🚀 {t("open_externally") || "Open Link"}</>
              ) : (
                <>📖 {isPurchased ? (t("read_now") || "Read Now") : (t("continue_reading") || "Continue Reading")}</>
              )}
            </Link>
          ) : (
            <>
              <div className="flex gap-2">
                {book.available_for_sale !== false && purchasePrice > 0 && (
                  <button
                    onClick={() => onBuy(book)}
                    disabled={!inStock}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 ${
                      !inStock
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                        : justAddedBuy
                        ? "bg-green-600 text-white"
                        : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/50 hover:bg-green-600 hover:text-white"
                    }`}
                  >
                    {justAddedBuy ? `✓ ${t("added") || "Added"}` : `🛒 ${t("buy") || "Buy"}`}
                  </button>
                )}
                {book.available_for_rent !== false && rentalPrice > 0 && (
                  <button
                    onClick={() => onRent(book)}
                    disabled={!inStock}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 ${
                      !inStock
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                        : justAddedRent
                        ? "bg-primary text-white"
                        : "bg-primary/10 dark:bg-primary/10 text-primary border border-primary/20 dark:border-primary/20 hover:bg-primary hover:text-white"
                    }`}
                  >
                    {justAddedRent ? `✓ ${t("added") || "Added"}` : `📅 ${t("rent") || "Rent"}`}
                  </button>
                )}
              </div>
              {/* Preview Button */}
              {readMode !== 'metadata' && (
                <Link
                  to={`/reader/${bookId}?preview=true`}
                  className="w-full flex items-center justify-center py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                >
                  🔍 {t("preview") || "Preview"}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────── Shop Page ─── */
const Shop = () => {
  const { addToCart } = useContext(CartContext);
  const { user }      = useContext(AuthContext);
  const navigate      = useNavigate();
  const { t, i18n }   = useTranslation();
  const isRtl = i18n.language === "ar";

  const [books,    setBooks]    = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [sortBy,   setSortBy]   = useState("default");
  const [page,     setPage]     = useState(1);

  const [userAccess,  setUserAccess]  = useState({}); // { bookId: access_row }
  const [rentBook,    setRentBook]    = useState(null); // modal target
  const [addedKey,    setAddedKey]    = useState(null); // flash feedback

  const CATEGORIES = useMemo(() => [
    { label: t("cat_all") || "All",       icon: "✦",  value: "" },
    { label: t("cat_fantasy") || "Fantasy",   icon: "🧙",  value: "Fantasy" },
    { label: t("cat_mystery") || "Mystery",   icon: "🔍",  value: "Mystery" },
    { label: t("cat_romance") || "Romance",   icon: "❤️",  value: "Romance" },
    { label: t("cat_history") || "History",   icon: "🏛️",  value: "History" },
    { label: t("cat_scifi") || "Sci-Fi",     icon: "🚀",  value: "Sci-Fi" },
    { label: t("cat_science") || "Science",   icon: "🔬",  value: "Science" },
    { label: t("cat_health") || "Health",    icon: "🏥",  value: "Health" },
  ], [t]);

  /* ── Fetch books from backend API ── */
  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  /* ── Fetch user access map ── */
  useEffect(() => {
    if (!user) return;
    const loadAccess = async () => {
      const authUserId = user?.id || user?._id;
      if (!authUserId) return;

      const { data: ubaData } = await supabase
        .from("user_book_access")
        .select("book_id, access_type, expires_at, is_active")
        .eq("user_id", authUserId)
        .eq("is_active", true);

      const { data: rentalsData } = await supabase
        .from("rentals")
        .select("book_id, status, rental_due_date")
        .eq("user_id", authUserId)
        .eq("status", "active");

      const map = {};
      const now = new Date();

      if (rentalsData) {
        rentalsData.forEach((r) => {
          if (r.rental_due_date && new Date(r.rental_due_date) > now) {
            map[r.book_id] = { access_type: "rental", expires_at: r.rental_due_date };
          }
        });
      }

      if (ubaData) {
        ubaData.forEach((a) => {
          if (a.access_type === "purchase") map[a.book_id] = a;
          else if (!map[a.book_id] && (!a.expires_at || new Date(a.expires_at) > now)) {
            map[a.book_id] = a;
          }
        });
      }
      setUserAccess(map);
    };
    loadAccess();
  }, [user]);

  /* ── Filter + Sort ── */
  useEffect(() => {
    let result = [...books];
    if (category) result = result.filter((b) => b.category?.toLowerCase() === category.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q)
      );
    }
    const price = (b) => b.rentalPrice || b.rental_price || 0;
    if (sortBy === "price-asc")  result.sort((a, b) => price(a) - price(b));
    if (sortBy === "price-desc") result.sort((a, b) => price(b) - price(a));
    if (sortBy === "title")      result.sort((a, b) => a.title?.localeCompare(b.title));
    if (sortBy === "newest")     result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(result);
    setPage(1);
  }, [books, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / BOOKS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * BOOKS_PER_PAGE, page * BOOKS_PER_PAGE);

  /* ── Handlers ── */
  const flashAdded = (key) => {
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 1800);
  };

  const handleBuy = (book) => {
    if (!user) { navigate("/login"); return; }
    const bookId = book._id || book.id;
    const purchasePrice = book.purchasePrice || book.purchase_price || 0;
    const discountPrice = book.discountPrice || book.discount_price || null;
    const price = (discountPrice && discountPrice < purchasePrice) ? discountPrice : purchasePrice;

    addToCart({ ...book, _id: bookId, accessType: "buy", rentDays: 1, totalPrice: price, purchasePrice: price });
    flashAdded(`${bookId}_buy`);
  };

  const handleRentClick = (book) => {
    if (!user) { navigate("/login"); return; }
    setRentBook(book);
  };

  const handleRentConfirm = (days, total) => {
    const book   = rentBook;
    const bookId = book._id || book.id;
    const pricePerDay = book.rentalPrice || book.rental_price || book.pricePerDay || book.price_per_day || 0;
    addToCart({ ...book, _id: bookId, accessType: "rent", rentDays: days, totalPrice: total, pricePerDay });
    flashAdded(`${bookId}_rent`);
    setRentBook(null);
  };

  const clearFilters = () => { setSearch(""); setCategory(""); setSortBy("default"); };

  /* ─────────────────────────────── JSX ─── */
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen transition-colors duration-200">

      {/* ── Page Header Banner ── */}
      <div className="relative py-16 px-4 overflow-hidden bg-gradient-to-br from-primary-pale to-purple-100 dark:from-gray-900 dark:to-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20" />

        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="animate-in slide-in-from-left duration-700">
              <span className="inline-block bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-primary dark:text-primary-light text-[10px] font-black px-3 py-1.5 rounded-full mb-4 tracking-widest uppercase shadow-sm border border-white/50 dark:border-gray-700">
                ✦ {t("book_catalog") || "Book Catalog"}
              </span>
              <h1 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {t("browse_our") || "Browse Our"} <span className="text-primary">{t("shop") || "Shop"}</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg mt-4 max-w-xl font-medium leading-relaxed">
                {t("shop_subtitle") || "Explore thousands of books — buy to own or rent for a few days."}
              </p>
            </div>
            
            <div className="flex gap-4 animate-in slide-in-from-right duration-700">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl px-8 py-5 text-center shadow-xl shadow-primary/5 border border-white dark:border-gray-800">
                <p className="text-3xl font-black text-primary">{books.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mt-1">{t("books") || "Books"}</p>
              </div>
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl px-8 py-5 text-center shadow-xl shadow-purple-500/5 border border-white dark:border-gray-800">
                <p className="text-3xl font-black text-primary">{CATEGORIES.length - 1}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mt-1">{t("categories") || "Categories"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-gray-100 dark:border-gray-800 p-2 sm:p-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search_placeholder") || "Search books, authors, categories..."}
              className="w-full pl-16 pr-20 py-5 bg-gray-50/50 dark:bg-gray-800/50 rounded-full text-base text-gray-700 dark:text-white placeholder-gray-400 font-bold border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-primary focus:outline-none transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Premium Category Cards ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-6 pl-2">{t("explore_categories") || "Explore Categories"}</h2>
        <div className="flex items-stretch gap-4 overflow-x-auto pb-8 pt-2 px-2 -mx-2 no-scrollbar snap-x snap-mandatory">
          {CATEGORIES.map((cat, idx) => {
            const isActive = category === cat.value;
            // Define unique energetic gradients for categories
            const gradients = [
              "from-blue-600 to-indigo-600",
              "from-purple-600 to-pink-600",
              "from-orange-500 to-red-600",
              "from-emerald-500 to-teal-600",
              "from-amber-500 to-orange-500",
              "from-cyan-500 to-blue-500",
              "from-rose-500 to-pink-600",
              "from-indigo-500 to-purple-600"
            ];
            const bgGrad = gradients[idx % gradients.length];

            return (
              <button
                key={cat.value}
                onClick={() => setCategory(isActive ? "" : cat.value)}
                className={`snap-center shrink-0 w-24 sm:w-28 relative group flex flex-col items-center justify-center gap-3 p-4 rounded-[1.8rem] transition-all duration-500 outline-none ${
                  isActive
                    ? "shadow-2xl shadow-primary/30 scale-105 border-0"
                    : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-2"
                }`}
              >
                {/* Active Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                
                {/* Hover Aura */}
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} />

                {/* Icon Container */}
                <div className={`relative z-10 w-10 h-10 rounded-[1.2rem] flex items-center justify-center text-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                  isActive 
                    ? "bg-white/20 text-white shadow-inner backdrop-blur-md" 
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-gray-700"
                }`}>
                  {cat.icon}
                </div>
                
                <span className={`relative z-10 text-[9px] font-black uppercase tracking-widest transition-colors ${
                  isActive 
                    ? "text-white" 
                    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-gray-400 italic">
              {t("showing") || "Showing"} <span className="text-gray-900 dark:text-white not-italic">{filtered.length}</span> {t("books") || "books"}
            </p>
            {(search || category) && (
              <button onClick={clearFilters} className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline px-3 py-1 rounded-full bg-primary/5">
                {t("clear_filters") || "Clear filters"} ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider whitespace-nowrap">{t("sort_by") || "Sort by"}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm font-black text-gray-900 dark:text-white focus:outline-none cursor-pointer pr-4"
            >
              <option value="default">{t("sort_relevant") || "Relevant"}</option>
              <option value="title">{t("sort_title") || "Title A–Z"}</option>
              <option value="price-asc">{t("sort_price_low") || "Price: Low → High"}</option>
              <option value="price-desc">{t("sort_price_high") || "Price: High → Low"}</option>
              <option value="newest">{t("sort_newest") || "Newest"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Book Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8 animate-in fade-in slide-in-from-left duration-700">
          {category ? (
            isRtl 
              ? `${t("books_label")} ${t("cat_" + category.replace(/\s+/g, '').toLowerCase())}` 
              : `${t("cat_" + category.replace(/\s+/g, '').toLowerCase())} ${t("books_label")}`
          ) : (t("all_books") || "All Books")}
        </h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-16 h-16 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-6" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t("loading_catalog") || "Loading catalog..."}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 p-12 rounded-[2rem] text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="font-black text-xl mb-2">{t("failed_load_books") || "Failed to load books"}</p>
            <p className="text-sm font-medium opacity-70">{error}</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-40 bg-gray-50/50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
            <div className="text-8xl mb-8 group-hover:scale-110 transition-transform duration-500">📚</div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t("no_books_found") || "No books found"}</h3>
            <p className="text-gray-400 dark:text-gray-500 font-medium mb-10 max-w-sm mx-auto">{t("no_books_subtitle") || "Try a different search term or category to find what you're looking for."}</p>
            <button
              onClick={clearFilters}
              className="bg-primary hover:bg-opacity-90 text-white font-black px-10 py-4 rounded-full transition-all text-sm shadow-xl shadow-primary/20"
            >
              {t("clear_all_filters") || "Clear All Filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {paginated.map((book) => {
              const bookId = book._id || book.id;
              return (
                <ShopBookCard
                  key={bookId}
                  book={book}
                  access={userAccess[bookId] || null}
                  onBuy={handleBuy}
                  onRent={handleRentClick}
                  addedKey={addedKey}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pb-24 px-4">
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page === 1}
            className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary disabled:opacity-30 transition-all bg-white dark:bg-gray-900"
          >
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`e-${idx}`} className="w-10 h-12 flex items-center justify-center text-gray-300 font-black">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`w-12 h-12 rounded-2xl text-sm font-black transition-all border-2 ${
                      p === page
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110"
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-primary"
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }
          </div>

          <button
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page === totalPages}
            className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary disabled:opacity-30 transition-all bg-white dark:bg-gray-900"
          >
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      {/* ── Rent Modal ── */}
      {rentBook && (
        <RentModal
          book={rentBook}
          onClose={() => setRentBook(null)}
          onConfirm={handleRentConfirm}
        />
      )}
    </div>
  );
};

export default Shop;
