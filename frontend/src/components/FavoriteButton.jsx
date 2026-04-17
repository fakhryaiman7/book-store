import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const FavoriteButton = ({ bookId, className = "" }) => {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && bookId) {
      checkIfFavorite();
    }
  }, [user, bookId]);

  const checkIfFavorite = async () => {
    try {
      const { data } = await axios.get(`/api/favorites/check/${bookId}`);
      setIsFavorite(data.isFavorite);
    } catch (err) {
      console.error("Error checking favorite status:", err);
    }
  };

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert(t("login_to_favorite") || "Please login to add books to favorites");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`/api/favorites/toggle/${bookId}`);
      setIsFavorite(data.isFavorite);
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`p-2 rounded-full transition-all duration-300 ${
        isFavorite 
          ? "text-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm" 
          : "text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      } ${className}`}
      title={isFavorite ? t("remove_from_favorites") : t("add_to_favorites")}
    >
      <svg 
        className={`w-5 h-5 transition-transform ${loading ? "scale-90" : "scale-100 hover:scale-110"}`} 
        fill={isFavorite ? "currentColor" : "none"} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
    </button>
  );
};

export default FavoriteButton;
