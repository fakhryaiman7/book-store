import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import API from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const MyLibrary = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const fetchLibrary = async () => {
      setLoading(true);
      try {
        // Fetch from SECURE Backend API
        const { data } = await API.get("/api/transactions/mylibrary");
        
        if (!data.success) throw new Error(data.message);

        const now = new Date();
        let merged = [];

        // 1. Process Rentals
        (data.rentals || []).forEach(r => {
          if (!r.book) return;
          const isExp = r.status !== "active" || (r.rental_due_date && new Date(r.rental_due_date) < now);
          merged.push({
            id: r.id, 
            access_type: "rental",
            book: r.book,
            isExpired: isExp,
            daysLeft: r.rental_due_date 
              ? Math.max(0, Math.ceil((new Date(r.rental_due_date) - now) / (1000 * 60 * 60 * 24))) 
              : null,
            expires_at: r.rental_due_date,
            created_at: r.created_at || r.granted_at
          });
        });

        // 2. Process Purchases
        (data.purchases || []).forEach(a => {
          const bookData = a.book || { title: "Unknown Book", author: "ID: " + a.book_id };
          merged.push({
            id: a.id,
            access_type: "purchase",
            book: bookData,
            isExpired: false,
            daysLeft: null,
            created_at: a.created_at || a.granted_at
          });
        });

        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(merged);
      } catch (err) {
        console.error("Failed to fetch library:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [user, navigate]);

  const filtered = items.filter((a) => {
    if (filter === "purchased") return a.access_type === "purchase";
    if (filter === "rental") return a.access_type === "rental";
    return true;
  });

  const purchased = items.filter((a) => a.access_type === "purchase").length;
  const rentalsCount = items.filter((a) => a.access_type === "rental").length;
  const activeRentals = items.filter((a) => a.access_type === "rental" && !a.isExpired).length;

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen py-12 px-4 sm:px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 animate-in slide-in-from-left duration-500">
          <div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-4 uppercase">{t("my_library") || "My Library"}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm tracking-widest uppercase opacity-80">{t("library_subtitle") || "Books you own or are currently renting"}</p>
          </div>
          
          <div className="flex bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-2xl backdrop-blur-xl border border-gray-100/50 dark:border-gray-800/50">
            {[
              { key: "all", label: t("all") || "All" },
              { key: "purchased", label: t("purchased") || "Purchased" },
              { key: "rental", label: t("rentals") || "Rentals" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === key 
                    ? "bg-white dark:bg-gray-800 text-primary shadow-xl shadow-black/5 dark:text-white" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-700 delay-150">
          {[
            { val: purchased, label: t("books_purchased") || "Books Purchased", icon: "💎", color: "blue" },
            { val: activeRentals, label: t("active_rentals") || "Active Rentals", icon: "⏳", color: "purple" },
            { val: items.length, label: t("total_collection") || "Total Collection", icon: "📚", color: "indigo" }
          ].map((s, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 flex items-center gap-6 group hover:scale-[1.02] transition-transform shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-3xl group-hover:animate-bounce">{s.icon}</div>
              <div>
                <p className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{s.val}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-80">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-16 h-16 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-6" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">{t("loading_library") || "Syncing your library..."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-24 text-center border border-dashed border-gray-200 dark:border-gray-800 animate-in fade-in duration-500">
            <div className="w-32 h-32 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl">📥</div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">{t("empty_library_title") || "No books here yet"}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 max-w-sm mx-auto">{t("empty_library_text") || "Your library feels a bit lonely. Discover your next great read in our catalog."}</p>
            <Link to="/" className="inline-flex items-center gap-3 bg-primary text-white font-black py-5 px-10 rounded-2xl shadow-2xl shadow-primary/30 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest">
              {t("explore_catalog") || "Explore Catalog"} <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filtered.map((access, i) => {
              const b = access.book;
              if (!b) return null;
              const isPurchase = access.access_type === "purchase";
              const isExpired = access.isExpired;
              const canRead = !isExpired;
              const canDownload = isPurchase && (b.book_file_url || b.bookFileUrl);

              return (
                <div
                  key={access.id}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className={`group bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8 ${
                    isExpired ? "border-red-100 dark:border-red-900/20 opacity-80" : "border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={b.cover_image || b.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f"}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                         {canRead ? (
                          <Link to={`/reader/${b.id || b._id}`} className="flex-1 bg-white text-black font-black text-[10px] py-3 rounded-xl uppercase tracking-widest text-center shadow-lg hover:bg-primary hover:text-white transition-all">
                            {b.read_mode === 'external_read' ? (t("open_externally") || "Open Link") : (t("read_now") || "Read Now")}
                          </Link>
                        ) : (
                          <Link to={`/book/${b.id || b._id}`} className="flex-1 bg-red-500 text-white font-black text-[10px] py-3 rounded-xl uppercase tracking-widest text-center shadow-lg hover:bg-red-600 transition-all">
                            {t("renew") || "Renew"}
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg shadow-xl uppercase tracking-[0.2em] backdrop-blur-xl border border-white/20 ${
                        isPurchase ? "bg-green-500/90 text-white" : isExpired ? "bg-red-500/90 text-white" : "bg-primary/90 text-white"
                      }`}>
                        {isPurchase ? t("owned") : isExpired ? t("expired") : t("rented")}
                      </span>
                    </div>
                  </div>

                  <div className="p-8">
                    <h3 className="font-black text-gray-900 dark:text-white mb-2 line-clamp-1 leading-tight text-lg group-hover:text-primary transition-colors">{b.title}</h3>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 opacity-80">{t("by") || "BY"} {b.author}</p>

                    <div className="pt-6 border-t border-gray-50 dark:border-gray-800 mt-auto">
                      {isPurchase ? (
                        <div className="flex items-center gap-3 text-green-500 dark:text-green-400">
                          <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-sm">✅</div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{t("permanent_access") || "Lifetime Access"}</span>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-3 ${isExpired ? "text-red-500" : access.daysLeft <= 2 ? "text-orange-500" : "text-primary-light"}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            isExpired ? "bg-red-50 dark:bg-red-900/20" : access.daysLeft <= 2 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                          }`}>
                            {isExpired ? "⌛" : "🕒"}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                              {isExpired ? t("expired_on") : t("expires_in")}
                            </p>
                            <p className="text-xs font-bold leading-none">
                              {isExpired 
                                ? new Date(access.expires_at).toLocaleDateString() 
                                : `${access.daysLeft} ${t(access.daysLeft === 1 ? "day_left" : "days_left") || "days left"}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLibrary;
