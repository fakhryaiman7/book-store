import { useState, useEffect, useContext } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "../api/axios";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({ revenue: 0, activeRentals: 0, booksInStock: 0, totalUsers: 0, v: null });
  const [recentRentals, setRecentRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, recentRes] = await Promise.all([
          axios.get("/api/admin/stats"),
          axios.get("/api/admin/orders"),
        ]);

        const s = statsRes.data;
        setStats({ 
          revenue: s.totalRevenue || 0, 
          activeRentals: s.activeRentals || 0, 
          booksInStock: s.booksCount || 0, 
          totalUsers: s.usersCount || 0,
          v: s.debug?.v || null
        });
        
        // Take the first 5 for recent transactions
        setRecentRentals(recentRes.data?.slice(0, 5) || []);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleGenerateReport = () => {
    const rows = [
      [t("report_metric") || "Metric", t("report_value") || "Value"],
      [t("total_revenue") || "Total Revenue", `${stats.revenue.toFixed(2)} ${t("currency")}`],
      [t("active_rentals") || "Active Rentals", stats.activeRentals],
      [t("books_in_stock") || "Books in Stock", stats.booksInStock],
      [t("total_users") || "Total Users", stats.totalUsers],
    ];
    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bookverse_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { title: t("total_revenue") || "Total Revenue", value: loading ? "..." : `${stats.revenue.toFixed(0)} ${t("currency")}`, icon: "💰", color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" },
    { title: t("active_rentals") || "Active Rentals", value: loading ? "..." : stats.activeRentals.toLocaleString(), icon: "🔄", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" },
    { title: t("books_in_stock") || "Books in Stock", value: loading ? "..." : stats.booksInStock.toLocaleString(), icon: "📚", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" },
    { title: t("total_users") || "Total Users", value: loading ? "..." : stats.totalUsers.toLocaleString(), icon: "👥", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300", adminOnly: true },
  ].filter(card => !card.adminOnly || user?.isAdmin);

  const fmt = (d) => {
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  const statusBadge = (row) => {
    const isPurchase = row.access_type === "purchase";
    if (isPurchase) {
      return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase tracking-wider rounded-lg bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">{t("filter_purchases") || "Purchase"}</span>;
    }

    const now = new Date();
    const isOverdue = row.status === "active" && new Date(row.rental_due_date) < now;
    const status = isOverdue ? (t("status_overdue") || "Overdue") : row.status === "returned" ? (t("status_completed") || "Completed") : (t("status_active") || "Active");
    const cls = isOverdue ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" : row.status === "returned" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300" : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
    return <span className={`px-2 inline-flex text-[10px] leading-5 font-black uppercase tracking-wider rounded-lg ${cls}`}>{status}</span>;
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col md:flex-row transition-colors duration-200 uppercase-form">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{user?.isAdmin ? (t("dashboard_overview") || "Dashboard Overview") : (t("author_dashboard") || "Author Dashboard")}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{user?.isAdmin ? (t("welcome_admin") || "Welcome back, Administrator") : (t("welcome_author") || "Welcome back, Author")} <span className="text-primary font-black">{user?.name}</span> {stats.v && <span className="text-[10px] ml-2 opacity-50">Backend: {stats.v}</span>}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {user?.isAdmin && (
              <button 
                onClick={() => navigate("/admin/import")} 
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 font-black py-3 px-6 rounded-2xl shadow-sm hover:shadow-xl transition-all flex items-center space-x-2 rtl:space-x-reverse text-xs uppercase tracking-widest hover:border-primary/20"
              >
                <span>📥</span><span>{t("import_books") || "Import Books"}</span>
              </button>
            )}
            <button 
              onClick={handleGenerateReport} 
              className="bg-primary text-white font-black py-3 px-6 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all flex items-center space-x-2 rtl:space-x-reverse text-xs uppercase tracking-widest"
            >
              <span>📊</span><span>{t("generate_report") || "Generate Report"}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm p-6 border border-gray-100 dark:border-gray-800 flex items-center space-x-4 rtl:space-x-reverse hover:shadow-xl transition-all duration-300 group">
              <div className={`p-4 rounded-2xl text-2xl ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>{stat.icon}</div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">{stat.title}</p>
                <p className={`text-xl font-black text-gray-900 dark:text-white ${loading ? "animate-pulse" : ""}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/20">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <span className="w-2 h-6 bg-primary rounded-full" />
              {t("recent_transactions") || "Recent Transactions"}
            </h2>
            <button onClick={() => navigate("/admin/rentals")} className="text-primary hover:text-opacity-80 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl bg-primary/5">
              {t("view_all") || "View All"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                <tr>
                  {[t("table_id") || "ID", t("table_user") || "User", t("table_book") || "Book", t("table_date") || "Date", t("table_status") || "Status"].map((h, i) => (
                    <th key={i} className="px-8 py-4 text-left rtl:text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-8 py-5"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4"></div></td>
                      ))}
                    </tr>
                  ))
                ) : recentRentals.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-medium italic">{t("no_transactions_yet") || "No transactions yet."}</td></tr>
                ) : (
                  recentRentals.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                      <td className="px-8 py-5 whitespace-nowrap text-[11px] font-black text-gray-900 dark:text-white font-mono opacity-60 group-hover:opacity-100 transition-opacity">#{row.id?.slice(0, 8).toUpperCase() || "—"}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-300">{row.user?.name || "—"}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-300">{row.book?.title || "—"}</td>
                      <td className="px-8 py-5 whitespace-nowrap text-xs font-medium text-gray-400 dark:text-gray-500">{fmt(row.created_at || row.granted_at || new Date())}</td>
                      <td className="px-8 py-5 whitespace-nowrap">{statusBadge(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
