import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const AdminSidebar = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const currentPath = location.pathname;

  const links = [
    { name: t("nav_dashboard") || "Dashboard", path: "/admin", icon: "📊" },
    { name: t("manage_books") || "Manage Books", path: "/admin/books", icon: "📚" },
    { name: t("orders_rentals") || "Orders / Rentals", path: "/admin/rentals", icon: "🔄" },
    { name: t("users") || "Users", path: "/admin/users", icon: "👥", adminOnly: true },
    { name: t("import_books") || "Import Books", path: "/admin/import", icon: "📥", adminOnly: true },
  ].filter(link => !link.adminOnly || user?.isAdmin);

  const portalTitle = user?.isAdmin ? (t("admin_portal") || "Admin Portal") : (t("author_portal") || "Author Portal");
  const portalDesc = user?.isAdmin ? (t("manage_platform") || "Manage your platform") : (t("manage_your_books") || "Manage your books");

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white w-full md:w-64 flex-shrink-0 md:min-h-[calc(100vh-64px)] rounded-b-xl md:rounded-b-none md:rounded-r-xl shadow-sm md:shadow-xl overflow-hidden border-r border-gray-100 dark:border-gray-800 transition-colors duration-200">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950/20">
        <h2 className="text-xl font-bold text-primary dark:text-accent tracking-wide uppercase">{portalTitle}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{portalDesc}</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const isActive = currentPath === link.path || (link.path !== '/admin' && currentPath.startsWith(link.path));
          
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20 font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-white border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-sm font-bold uppercase tracking-wider">{link.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto p-4 hidden md:block border-t border-gray-100 dark:border-gray-800 mt-20">
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700 shadow-inner">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">BookVerse Admin</p>
          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-200/50 dark:border-green-800/30">{t("system_online") || "System Online"}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
