import { useContext, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { useTranslation } from "react-i18next";

import { useTheme } from "../context/ThemeContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', newLang);
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { label: t("nav_home"), path: "/" },
    { label: t("nav_shop"), path: "/shop" },
    { label: t("nav_contact"), path: "/contact" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[70px]">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
              <span className="text-white text-xl">📚</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tighter text-gray-900 dark:text-white">Book<span className="text-primary">Verse</span></span>
          </Link>

          {/* ── Center Nav Links (desktop) ── */}
          <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-5 py-2 text-sm font-semibold transition-colors duration-200 rounded-lg ${
                  isActive(link.path)
                    ? "text-primary bg-primary/5 dark:bg-primary/10"
                    : "text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary-pale dark:hover:bg-primary/20"
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* ── Right Side ── */}
          <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'light' ? t('dark_mode') : t('light_mode')}
            >
              {theme === 'light' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>

            {/* Favorites Icon */}
            <Link
              to="/favorites"
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={t("nav_favorites")}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors uppercase"
            >
              {i18n.language === 'en' ? 'AR' : 'EN'}
            </button>

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary-pale dark:hover:bg-primary/20 transition-colors"
              title={t("nav_cart")}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>

            {user ? (
              <>
                {/* My Library */}
                <Link
                  to="/my-library"
                  className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary-pale dark:hover:bg-primary/20"
                >
                  {t("nav_library")}
                </Link>

                {/* Admin badge */}
                {(user.isAdmin || user.role === "admin") && (
                  <Link
                    to="/admin"
                    className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-primary dark:text-primary-light px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                  >
                    {t("nav_admin")}
                  </Link>
                )}

                {/* User avatar / profile */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse ps-2 border-s border-gray-100 dark:border-gray-800">
                  <Link to="/profile" className="flex items-center space-x-2 rtl:space-x-reverse group">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-800 group-hover:border-primary transition-colors">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-sm">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      {user.name?.split(' ')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title={t("nav_logout")}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  {t("nav_login")}
                </Link>
                {/* User icon - Removed as per instruction, but keeping the original structure for now.
                    The instruction didn't explicitly remove it, but the new code snippet for this section
                    doesn't include it. I will remove it to match the provided snippet.
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-primary-pale transition-colors cursor-pointer">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                */}
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition-colors shadow-sm"
                >
                  {t("sign_up")}
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-primary rounded-lg"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 pb-5 pt-3 shadow-lg">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between px-4 py-2">
               <button onClick={toggleTheme} className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center space-x-2 rtl:space-x-reverse">
                 <span>{theme === 'light' ? '🌙' : '☀️'}</span>
                 <span>{theme === 'light' ? t('dark_mode') : t('light_mode')}</span>
               </button>
               <button onClick={toggleLanguage} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                 {i18n.language === 'en' ? 'Arabic (AR)' : 'English (EN)'}
               </button>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  isActive(link.path) ? "bg-primary-pale dark:bg-primary/20 text-primary" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2 flex flex-col space-y-1">
              <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between">
                {t("nav_cart")}
                {cartItems.length > 0 && <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{cartItems.length}</span>}
              </Link>
              <Link to="/favorites" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between">
                {t("nav_favorites")}
              </Link>
              {user ? (
                <>
                  <Link to="/my-library" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("nav_library")}</Link>
                  {(user.isAdmin || user.role === "admin") && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-primary rounded-lg hover:bg-primary-pale dark:hover:bg-primary/20">{t("nav_admin")}</Link>
                  )}
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="px-4 py-2.5 text-sm font-semibold text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-left rtl:text-right">
                    {t("nav_logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("nav_login")}</Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)} className="px-4 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg text-center">{t("sign_up")}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
