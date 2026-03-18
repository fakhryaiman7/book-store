import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

const Cart = () => {
  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (v) => `${v || 0} ${t("currency")}`;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

  const checkoutHandler = async () => {
    if (!user) { navigate("/login?redirect=cart"); return; }
    setLoading(true); setError(null);

    try {
      for (const item of cartItems) {
        const bookId = item.id || item._id;
        const isRental = item.accessType === "rent" || item.accessType === "rental";
        const isPurchase = item.accessType === "buy" || item.accessType === "purchase";
        const totalCost = item.totalPrice || 0;
        const now = new Date();
        const authUserId = user?.id || user?._id;

        if (!authUserId) throw new Error("Invalid user authentication session. Please log in again.");

        if (isRental) {
          // --- RENTAL flow ---
          const rentDays = item.rentDays || 1;
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + rentDays);

          // Insert rental record
          const { data: rental, error: rentalErr } = await supabase
            .from("rentals")
            .insert([{
              user_id: authUserId,
              book_id: bookId,
              rental_days: rentDays,
              rental_price_per_day: parseFloat(item.pricePerDay || item.price_per_day || 0),
              total_rental_cost: totalCost,
              rental_start_date: now.toISOString(),
              rental_due_date: dueDate.toISOString(),
              status: "active",
            }])
            .select()
            .single();

          if (rentalErr) throw new Error("Rental failed: " + rentalErr.message);

          // Grant rental access in user_book_access
          await supabase.from("user_book_access").upsert([{
            user_id: authUserId,
            book_id: bookId,
            access_type: "rental",
            expires_at: dueDate.toISOString(),
            is_active: true,
            rental_id: rental.id,
            granted_at: now.toISOString(),
          }], { onConflict: "user_id,book_id,access_type" });

          // Decrement stock
          const { data: bookData } = await supabase.from("books").select("count_in_stock").eq("id", bookId).single();
          if (bookData) {
            await supabase.from("books").update({ count_in_stock: Math.max(0, bookData.count_in_stock - 1) }).eq("id", bookId);
          }

        } else if (isPurchase) {
          // --- PURCHASE flow ---
          const { error: orderErr } = await supabase.from("orders").insert([{
            user_id: authUserId,
            total_amount: totalCost,
            payment_status: "paid",
            order_status: "completed",
          }]).select().single();

          if (orderErr) throw new Error("Order recording failed: " + orderErr.message);

          // Grant permanent purchase access
          await supabase.from("user_book_access").upsert([{
            user_id: authUserId,
            book_id: bookId,
            access_type: "purchase",
            expires_at: null, // permanent
            is_active: true,
            granted_at: now.toISOString(),
          }], { onConflict: "user_id,book_id,access_type" });

          // Decrement stock
          const { data: bookData } = await supabase.from("books").select("count_in_stock").eq("id", bookId).single();
          if (bookData) {
            await supabase.from("books").update({ count_in_stock: Math.max(0, bookData.count_in_stock - 1) }).eq("id", bookId);
          }
        }
      }

      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-950 min-h-screen py-24 px-4 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-16 max-w-lg w-full text-center border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-700">
          <div className="text-8xl mb-10 animate-bounce">🎉</div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{t("order_confirmed") || "Order Confirmed!"}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-12 text-lg">{t("order_success_msg") || "Your books are now waiting for you in your library."}</p>
          <div className="flex flex-col gap-4">
            <Link to="/my-library" className="bg-primary text-white font-black py-5 px-10 rounded-2xl shadow-xl shadow-primary/30 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest">
              {t("go_to_library") || "Go to My Library"}
            </Link>
            <Link to="/" className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black py-5 px-10 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all text-xs uppercase tracking-widest border border-gray-100 dark:border-gray-700">
              {t("browse_more") || "Browse More Books"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen py-20 px-4 sm:px-6 lg:px-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{t("shopping_cart") || "Shopping Cart"}</h1>
            <p className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-[0.2em]">{cartItems.length} {t("items_label") || "Items in total"}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-8 rounded-3xl animate-in slide-in-from-top-4 duration-500">
            <p className="font-black text-xs uppercase tracking-widest mb-2">Checkout Failed</p>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-10 text-4xl">🛒</div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{t("cart_empty_title") || "Your cart is empty"}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-12 text-lg">{t("cart_empty_msg") || "Add a book to start your journey!"}</p>
            <Link to="/" className="inline-block bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-primary/30 hover:bg-opacity-95 active:scale-95 transition-all text-sm uppercase tracking-widest">
              {t("start_browsing") || "Start Browsing"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            {/* Items */}
            <div className="lg:w-[65%] space-y-8">
              {cartItems.map((item, idx) => {
                const cartKey = `${item._id}_${item.accessType}`;
                const isRent = item.accessType === "rent" || item.accessType === "rental";
                return (
                  <div key={cartKey} className="group bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 flex flex-col sm:flex-row gap-10 border border-gray-50 dark:border-gray-800/50 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="relative shrink-0 perspective-1000">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f"}
                        alt={item.title}
                        className="w-full sm:w-32 h-44 object-cover rounded-2xl shadow-lg group-hover:rotate-y-12 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-6">
                        <div className="space-y-1">
                          <Link to={`/book/${item._id}`} className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white hover:text-primary transition-colors tracking-tight line-clamp-2">
                            {item.title}
                          </Link>
                          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                            {t("by")} <span className="text-gray-800 dark:text-gray-200">{item.author}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>

                      <div className="mt-auto pt-8 flex items-end justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border transition-all ${isRent ? "bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-light border-primary/20" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 border-green-100 dark:border-green-800"}`}>
                             {isRent ? `⏳ ${t("rent")} · ${item.rentDays} ${t(item.rentDays === 1 ? "day" : "days")}` : `🛒 ${t("purchase")}`}
                          </span>
                          {isRent && (
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">{formatCurrency(item.pricePerDay)}/d</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id || item.id, item.accessType)}
                          className="p-3 rounded-2xl text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90 group/btn"
                        >
                          <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:w-[35%] w-full">
              <div className="bg-white dark:bg-gray-900 p-10 lg:p-12 rounded-[3.5rem] shadow-2xl border border-gray-50 dark:border-gray-800 sticky top-32 space-y-10 overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] pb-6 border-b border-gray-50 dark:border-gray-800">{t("order_summary") || "Order Summary"}</h2>

                <div className="space-y-6">
                  {cartItems.map((item) => {
                    const isRent = item.accessType === "rent" || item.accessType === "rental";
                    return (
                      <div key={`${item._id}_${item.accessType}`} className="flex justify-between items-center group">
                        <div className="max-w-[70%]">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{isRent ? t("rental") : t("purchase")}</p>
                        </div>
                        <span className="text-xs font-black text-gray-900 dark:text-white tracking-widest">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    );
                  })}
                  
                  <div className="pt-10 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("grand_total") || "Total"}</span>
                      <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter transition-all hover:scale-105">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-6 border border-primary/10">
                   <p className="text-primary dark:text-primary-light font-black text-[9px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                     <span className="text-sm">🛡️</span> {t("secure_checkout") || "Secure Checkout"}
                   </p>
                   <p className="text-gray-500 dark:text-gray-400 text-[10px] font-medium leading-relaxed">{t("checkout_disclaimer") || "Purchases grant permanent access. Rentals grant access for the selected duration."}</p>
                </div>

                <button
                  onClick={checkoutHandler}
                  disabled={loading}
                  className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 ${
                    loading ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-primary text-white shadow-primary/30 hover:bg-opacity-95"
                  }`}
                >
                  {loading ? (
                    <><div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div>{t("processing") || "Processing..."}</>
                  ) : `${t("place_order") || "Place Order"} — ${formatCurrency(subtotal)}`}
                </button>

                {!user && (
                  <p className="text-[10px] font-black text-center text-gray-400 uppercase tracking-widest mt-6 opacity-60">
                    <Link to="/login?redirect=cart" className="text-primary hover:underline">{t("sign_in") || "Sign in"}</Link> {t("to_checkout") || "to complete purchase"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
