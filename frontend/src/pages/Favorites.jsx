import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../components/FavoriteButton";

const Favorites = () => {
  const { user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          book_id,
          books (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data.map(f => f.books) || []);
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-950 min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("loading_catalog") || "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pb-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Header */}
        <div className="mb-12 text-center md:text-left rtl:md:text-right">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            {t("favorites_title") || "My Favorites"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t("favorites_subtitle") || "Books you've saved to read later"}
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-500">
            <div className="text-6xl mb-6 opacity-20">❤️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t("empty_favorites_title") || "No favorites yet"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              {t("empty_favorites_msg") || "Heart your favorite books to see them here!"}
            </p>
            <Link 
              to="/shop" 
              className="inline-flex items-center px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              {t("explore_catalog") || "Explore Catalog"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
            {favorites.map((book) => (
              <div key={book.id} className="group relative bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-3 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-500">
                
                {/* Book Cover */}
                <Link to={`/book/${book.id}`} className="block relative aspect-[2/3] overflow-hidden rounded-[1.5rem] mb-4">
                  <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* Favorite Action (Already on the card) */}
                <div className="absolute top-5 right-5 z-10">
                  <FavoriteButton 
                    bookId={book.id} 
                    className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-lg"
                  />
                </div>

                {/* Info */}
                <div className="px-2 pb-2">
                  <div className="flex flex-col mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 opacity-60">
                      {t(`cat_${book.category?.toLowerCase()}`) || book.category}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {book.title}
                    </h3>
                    <p className="text-[10px] font-semibold text-gray-400 mt-1">
                      {t("by")} {book.author}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {book.purchase_price} {t("currency")}
                      </span>
                    </div>
                    <Link
                      to={`/book/${book.id}`}
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all"
                    >
                      {t("view_details") || "View"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
