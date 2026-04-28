import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import { supabase } from "../lib/supabase";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import FavoriteButton from "../components/FavoriteButton";

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const formatCurrency = (v) => `${v || 0} ${t("currency")}`;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("rent"); // "rent" | "buy"
  const [rentDays, setRentDays] = useState(7);
  const [userAccess, setUserAccess] = useState(null); // null | { access_type, expires_at }
  const [accessLoading, setAccessLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch book from backend API
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await axios.get(`/api/books/${id}`);
        // Normalize field names
        setBook({
          ...data,
          purchasePrice: data.purchase_price || data.purchasePrice || 0,
          discountPrice: data.discount_price || data.discountPrice || null,
          rentalPrice: data.rental_price || data.rentalPrice || data.price_per_day || data.pricePerDay,
          countInStock: data.count_in_stock || data.countInStock || 0,
        });
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
    fetchReviews();
  }, [id]);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(`/api/books/${id}/reviews`);
      setReviews(data);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.post(`/api/books/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment
      }, config);
      
      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);
      fetchReviews();
      // Also refetch book to update avg rating
      const { data: updatedBook } = await axios.get(`/api/books/${id}`);
      setBook(prev => ({
        ...prev,
        rating_avg: updatedBook.rating_avg,
        rating_count: updatedBook.rating_count
      }));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Check if user already has access
  useEffect(() => {
    if (!user || !id) return;
    setAccessLoading(true);
    const checkAccess = async () => {
      const authUserId = user?.id || user?._id;
      if (!authUserId) return;

      const { data: ubaData } = await supabase
        .from("user_book_access")
        .select("access_type, expires_at, is_active")
        .eq("user_id", authUserId)
        .eq("book_id", id)
        .eq("is_active", true);

      const { data: rentalsData } = await supabase
        .from("rentals")
        .select("status, rental_due_date")
        .eq("user_id", authUserId)
        .eq("book_id", id)
        .eq("status", "active");

      let validPurchase = false;
      let validRental = null;
      const now = new Date();

      if (ubaData) {
        if (ubaData.some(a => a.access_type === "purchase")) validPurchase = true;
        const rental = ubaData.find(a => a.access_type === "rental");
        if (rental && (!rental.expires_at || new Date(rental.expires_at) > now)) {
          validRental = { access_type: "rental", expires_at: rental.expires_at };
        }
      }

      if (rentalsData && rentalsData.length > 0) {
        const r = rentalsData.find(_r => _r.rental_due_date && new Date(_r.rental_due_date) > now);
        if (r) {
          validRental = { access_type: "rental", expires_at: r.rental_due_date };
        }
      }

      if (validPurchase) setUserAccess({ access_type: "purchase" });
      else if (validRental) setUserAccess(validRental);
      else setUserAccess(null);

      setAccessLoading(false);
    };
    checkAccess();
  }, [user, id]);

  const handleAddToCart = () => {
    if (!user) { navigate("/login"); return; }
    
    // Use discountPrice if it exists and is valid for "buy" mode
    const finalPurchasePrice = (mode === "buy" && book.discountPrice && book.discountPrice < book.purchasePrice)
      ? book.discountPrice
      : book.purchasePrice;

    const totalPrice =
      mode === "buy"
        ? (finalPurchasePrice || 0)
        : (book.rentalPrice || 0) * rentDays;

    addToCart({
      ...book,
      _id: book._id || book.id,
      accessType: mode,
      rentDays: mode === "rent" ? rentDays : 1,
      totalPrice,
      pricePerDay: book.rentalPrice,
      purchasePrice: finalPurchasePrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const rentalTotal = ((book?.rentalPrice || 0) * rentDays);
  
  // Decide which price to show for Buying
  const actualBuyPrice = (book?.discountPrice && book?.discountPrice < book?.purchasePrice)
    ? book.discountPrice
    : (book?.purchasePrice || 0);

  if (loading) return (
    <div className="flex justify-center my-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
    </div>
  );

  if (error || !book) return (
    <div className="max-w-7xl mx-auto px-4 mt-8">
      <Link to="/" className="text-primary hover:underline font-semibold mb-4 inline-block">&larr; {t("back") || "Back"}</Link>
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded">{error || "Book not found"}</div>
    </div>
  );

  const inStock = book.countInStock > 0;
  const isExpiredRental = userAccess?.access_type === "rental" && userAccess?.expires_at && new Date(userAccess.expires_at) < new Date();
  const hasValidAccess = userAccess && !isExpiredRental;
  const canDownload = userAccess?.access_type === "purchase";

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen py-16 px-4 sm:px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary transition-all font-black text-[10px] uppercase tracking-[0.2em] mb-8 inline-flex items-center group">
          <svg className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0 rtl:rotate-180 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          {t("back_to_catalog") || "Back to Catalog"}
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-100/50 dark:border-gray-800/50 animate-in fade-in slide-in-from-bottom-12 duration-700">
          {/* Cover Section */}
          <div className="lg:w-[45%] bg-gray-50 dark:bg-gray-800/20 relative group overflow-hidden p-12 lg:p-20">
             {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
            
            <div className="relative z-10 perspective-1000 group-hover:perspective-2000 transition-all duration-700">
              <img
                src={book.cover_image || book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f"}
                alt={book.title}
                className="w-full h-full object-contain rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] group-hover:scale-105 group-hover:-rotate-2 transition-all duration-700"
              />
            </div>

            {!inStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-20 flex items-center justify-center p-8">
                <span className="text-white font-black bg-red-500 px-8 py-4 rounded-2xl shadow-2xl uppercase tracking-widest text-xs animate-pulse">
                  {t("out_of_stock") || "Out of Stock"}
                </span>
              </div>
            )}
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none" />
          </div>

          {/* Details Section */}
          <div className="p-10 lg:p-20 lg:w-[55%] flex flex-col bg-white dark:bg-gray-900 relative">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border border-primary/10">
                  {book.category}
                </span>
                <span className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border ${inStock ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"}`}>
                  {inStock ? t("in_stock") : t("out_of_stock")}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 leading-[1.1]">{book.title}</h1>
                  <p className="text-xl text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs">{t("by") || "BY"} <span className="text-gray-900 dark:text-gray-200">{book.author}</span></p>
                </div>
                <FavoriteButton bookId={id} className="scale-150 p-3 bg-gray-50 dark:bg-gray-800" />
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none pt-8 border-t border-gray-50 dark:border-gray-800">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">{t("description") || "Description"}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed font-normal">{book.description}</p>
              </div>

              <div className="flex flex-wrap gap-12 pt-8">
                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">{t("language")}</h4>
                   <p className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">{book.language || "English"}</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">{t("published")}</h4>
                   <p className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">{book.published_year}</p>
                </div>
                {inStock && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-60">{t("availability")}</h4>
                    <p className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-xs">{book.countInStock} {t("copies_left") || "Copies"}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Card */}
            <div className="mt-12">
              {accessLoading ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-10 animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                </div>
              ) : hasValidAccess ? (
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-500">
                  <div>
                    <p className="text-primary dark:text-primary-light font-black text-xs uppercase tracking-widest mb-2">
                       {userAccess.access_type === "purchase" ? "👑 " + t("owned_access") : "⏳ " + t("active_rental")}
                    </p>
                    {userAccess.expires_at && (
                      <p className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                        {t("valid_until")} {new Date(userAccess.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to={`/reader/${book._id || book.id}`} className="flex-1 bg-primary text-white font-black py-5 px-8 rounded-2xl shadow-2xl shadow-primary/30 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest text-center">
                      {book.read_mode === 'external_read' ? (
                        <>🚀 {t("open_externally") || "Open Link"}</>
                      ) : (
                        <>📖 {userAccess.access_type === "purchase" ? (t("read_now") || "Read Now") : (t("continue_reading") || "Continue Reading")}</>
                      )}
                    </Link>
                    {book.read_mode !== 'metadata' && (
                      <Link to={`/reader/${book._id || book.id}?preview=true`} className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black py-5 px-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs uppercase tracking-widest text-center">
                        🔍 {t("preview") || "Preview"}
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-10 lg:p-12 space-y-10">
                   <div className="flex bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden translate-z-0">
                    {book.available_for_rent !== false && (
                      <button onClick={() => setMode("rent")} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${mode === "rent" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-gray-400 hover:text-gray-600"}`}>
                        {t("rent")}
                      </button>
                    )}
                    {book.available_for_sale !== false && (
                      <button onClick={() => setMode("buy")} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${mode === "buy" ? "bg-green-600 text-white shadow-xl shadow-green-600/20" : "text-gray-400 hover:text-gray-600"}`}>
                        {t("buy")}
                      </button>
                    )}
                  </div>

                  {mode === "rent" ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-end gap-3 text-gray-900 dark:text-white">
                        <span className="text-4xl font-black">{formatCurrency(book.rentalPrice)}</span>
                        <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">/ {t("day")}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                          <span>{t("select_duration")}</span>
                          <span className="text-primary">{rentDays} {t(rentDays === 1 ? "day" : "days")}</span>
                        </label>
                        <div className="grid grid-cols-5 gap-3">
                          {[1, 3, 7, 14, 30].map((d) => (
                            <button key={d} onClick={() => setRentDays(d)} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${rentDays === d ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-400 hover:border-primary/30"}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-end gap-4 text-gray-900 dark:text-white">
                        <span className="text-5xl font-black leading-none">{formatCurrency(actualBuyPrice)}</span>
                        {book.discountPrice && book.discountPrice < book.purchasePrice && (
                          <span className="text-xl text-gray-400 line-through font-bold mb-2 uppercase tracking-tighter opacity-50">{formatCurrency(book.purchasePrice)}</span>
                        )}
                      </div>
                      <p className="text-green-600 dark:text-green-500 font-black text-[10px] uppercase tracking-widest bg-green-50 dark:bg-green-900/10 px-4 py-2 rounded-xl inline-block">
                        {t("permanent_collect")}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                      !inStock ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
                        : added ? "bg-green-600 text-white shadow-green-600/30"
                        : mode === "buy" ? "bg-green-600 text-white shadow-green-600/30 hover:bg-green-700"
                        : "bg-primary text-white shadow-primary/30 hover:bg-opacity-95"
                    }`}
                  >
                    {!inStock ? t("out_of_stock")
                      : added ? `✓ ${t("added_to_cart")}`
                      : mode === "buy" ? (t("add_to_cart") || "Add to Cart")
                      : (t("rent_for_cart") || "Rent Now")}
                  </button>

                  {book.read_mode !== 'metadata' && (
                    <Link
                      to={`/reader/${book._id || book.id}?preview=true`}
                      className="w-full mt-4 flex items-center justify-center py-5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                    >
                      🔍 {t("preview") || "Preview"}
                    </Link>
                  )}

                  {!user && (
                    <p className="text-[10px] font-black text-center text-gray-400 uppercase tracking-widest mt-6 opacity-60">
                      <Link to="/login" className="text-primary hover:underline">{t("sign_in") || "Sign in"}</Link> {t("to_buy_or_rent")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Reviews Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800 p-8 lg:p-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t("customer_reviews") || "Customer Reviews"}</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.round(book.rating_avg || 0) ? "fill-current" : "text-gray-200 dark:text-gray-700"}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-bold text-sm">{book.rating_avg?.toFixed(1) || "0.0"} ({book.rating_count || 0} {t("reviews")})</span>
              </div>
            </div>
            {user && (
              <button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-primary/10 hover:bg-primary hover:text-white transition-all"
              >
                {showReviewForm ? t("cancel") : t("write_review")}
              </button>
            )}
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mb-16 bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">{t("your_review")}</h3>
              <div className="space-y-6">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`transition-all ${reviewRating >= star ? "text-yellow-400 scale-110" : "text-gray-300 dark:text-gray-700 hover:text-yellow-200"}`}
                    >
                      <svg className="w-10 h-10 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t("review_placeholder") || "Share your thoughts about this book..."}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 min-h-[120px] outline-none focus:border-primary transition-colors text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-primary text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingReview ? "..." : t("submit_review")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-8">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-600 font-bold italic">{t("no_reviews") || "No reviews yet. Be the first to rate this book!"}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 pb-8 last:pb-0">
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src={review.users?.avatar_url || `https://ui-avatars.com/api/?name=${review.users?.name}&background=random`} 
                      alt={review.users?.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-gray-800"
                    />
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">{review.users?.name}</h4>
                      <div className="flex text-yellow-400 scale-75 origin-left">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-200 dark:text-gray-700"}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <span className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed pl-16 rtl:pr-16 rtl:pl-0">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

export default BookDetails;
