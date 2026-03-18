import { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

const AdminRentals = () => {
  const { t, i18n } = useTranslation();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [success, setSuccess] = useState(null);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      if (filter === "purchases") {
        const { data } = await supabase
          .from("user_book_access")
          .select(`*, user:users(name, email), book:books(title, image, purchase_price)`)
          .eq("access_type", "purchase")
          .order("created_at", { ascending: false });
        setRentals(data || []);
      } else {
        let query = supabase
          .from("rentals")
          .select(`*, user:users(name, email), book:books(title, image)`)
          .order("created_at", { ascending: false });
        if (filter !== "all") {
          if (filter === "active") query = query.eq("status", "active");
          else if (filter === "overdue") query = query.eq("status", "active"); 
          else query = query.eq("status", filter);
        }
        const { data } = await query;
        const now = new Date();
        let withStatus = (data || []).map(r => ({
          ...r,
          status: r.status === "active" && new Date(r.rental_due_date) < now ? "overdue" : r.status
        }));
        if (filter === "overdue") withStatus = withStatus.filter(r => r.status === "overdue");
        if (filter === "active") withStatus = withStatus.filter(r => r.status === "active");
        setRentals(withStatus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRentals(); }, [filter]);

  const updateStatus = async (rental, st) => {
    try {
      const now = new Date();
      const isActivating = st === "active";
      
      const updateData = { status: st, updated_at: now.toISOString() };
      
      if (st === "returned") {
        updateData.return_date = now.toISOString();
      } else if (st === "active") {
        updateData.return_date = null;
      }

      const { error: err } = await supabase.from("rentals").update(updateData).eq("id", rental.id);
      if (err) throw err;

      await supabase.from("user_book_access").update({ 
        is_active: isActivating 
      }).eq("rental_id", rental.id);

      if (st === "returned" && rental.status !== "returned") {
        const { data: b } = await supabase.from("books").select("count_in_stock").eq("id", rental.book_id).single();
        if (b) await supabase.from("books").update({ count_in_stock: (b.count_in_stock || 0) + 1 }).eq("id", rental.book_id);
      } else if (st === "active" && rental.status === "returned") {
        const { data: b } = await supabase.from("books").select("count_in_stock").eq("id", rental.book_id).single();
        if (b) await supabase.from("books").update({ count_in_stock: Math.max(0, (b.count_in_stock || 0) - 1) }).eq("id", rental.book_id);
      }

      setSuccess(t("status_updated_msg") || `Status updated to ${st}!`);
      fetchRentals();
    } catch (err) {
      console.error(err);
      alert(t("update_error") || "Error updating status: " + (err.message || "Unknown error"));
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const fmt = (d) => {
    if (!d) return "—";
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  const statusBadge = (status) => {
    const map = { 
      active: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300", 
      returned: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400", 
      overdue: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
      inactive: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300" 
    };
    return (
      <span className={`px-2.5 py-0.5 text-[10px] leading-5 font-black uppercase tracking-widest rounded-lg ${map[status] || "bg-gray-100 text-gray-700"}`}>
        {t(`status_${status}`) || status}
      </span>
    );
  };

  const counts = { 
    all: rentals.length, 
    active: rentals.filter(r => r.status === "active").length, 
    overdue: rentals.filter(r => r.status === "overdue").length, 
    returned: rentals.filter(r => r.status === "returned").length 
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col md:flex-row transition-colors duration-200">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t("orders_rentals") || "Orders / Rentals"}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            {counts.all} {t("total")} · {counts.active} {t("active")} · {counts.overdue} {t("overdue")}
          </p>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 p-4 rounded-xl animate-in slide-in-from-top duration-300 shadow-sm font-bold text-sm">
            {success}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 animate-in fade-in duration-700">
          {["all", "active", "overdue", "returned", "inactive", "purchases"].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" 
                  : "bg-white dark:bg-gray-900 text-gray-500 border border-gray-100 dark:border-gray-800 hover:border-primary/50"
              }`}
            >
              {t(`filter_${f}`) || f}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("loading") || "Loading..."}</p>
            </div>
          ) : rentals.length === 0 ? (
            <div className="text-center py-32 text-gray-400 dark:text-gray-500">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-xl font-black text-gray-900 dark:text-white mb-2">{t("no_rentals_found") || "No rentals found."}</p>
              <p className="text-sm font-medium">{t("no_rentals_subtitle") || "Transactions will appear here once customers interact with the platform."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-50 dark:divide-gray-800">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                  <tr>
                    {[t("table_id") || "ID", t("table_user") || "User", t("table_book") || "Book", t("table_days") || "Days", t("table_cost") || "Cost", t("table_start") || "Start", t("table_due") || "Due", t("table_return") || "Return", t("table_status") || "Status", t("table_actions") || "Actions"].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left rtl:text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {rentals.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap text-[11px] font-black text-gray-900 dark:text-white font-mono opacity-50 group-hover:opacity-100 transition-opacity uppercase">
                        #{r.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{r.user?.name || "—"}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{r.user?.email || ""}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{r.book?.title || "—"}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-black text-gray-400 dark:text-gray-500">{r.rental_days ? `${r.rental_days}d` : "—"}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-primary">
                        {parseFloat(r.total_rental_cost || r.book?.purchase_price || 0).toFixed(0)} {t("currency")}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-medium text-gray-400 dark:text-gray-500">{fmt(r.rental_start_date || r.granted_at || r.created_at)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-medium text-gray-400 dark:text-gray-500">{r.access_type === "purchase" ? (t("permanent") || "Permanent") : fmt(r.rental_due_date)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-medium text-gray-400 dark:text-gray-500">{fmt(r.return_date)}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {r.access_type === "purchase" ? (r.is_active ? statusBadge("active") : statusBadge("inactive")) : statusBadge(r.status)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {r.access_type === "purchase" ? (
                             r.is_active ? (
                               <button 
                                 onClick={async () => {
                                   await supabase.from("user_book_access").update({ is_active: false }).eq("id", r.id);
                                   setSuccess(t("access_disabled") || "Access disabled!");
                                   fetchRentals();
                                 }} 
                                 className="text-[9px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                               >
                                 {t("btn_disable") || "Disable"}
                               </button>
                             ) : (
                               <button 
                                 onClick={async () => {
                                   await supabase.from("user_book_access").update({ is_active: true }).eq("id", r.id);
                                   setSuccess(t("access_activated") || "Access reactivated!");
                                   fetchRentals();
                                 }} 
                                 className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-light hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all"
                               >
                                 {t("btn_activate") || "Activate"}
                               </button>
                             )
                          ) : (
                            <>
                              {(r.status === "active" || r.status === "overdue") && (
                                <>
                                  <button onClick={() => updateStatus(r, "returned")} className="text-[9px] font-black uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg transition-all">{t("btn_return") || "Return"}</button>
                                  <button onClick={() => updateStatus(r, "inactive")} className="text-[9px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded-lg transition-all">{t("btn_disable") || "Disable"}</button>
                                </>
                              )}
                              {(r.status === "returned" || r.status === "inactive") && (
                                <button onClick={() => updateStatus(r, "active")} className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-light hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-all">{t("btn_reactivate") || "Reactivate"}</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRentals;
