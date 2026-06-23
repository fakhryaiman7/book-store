import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import axios from "./api/axios";

import Navbar from "./components/Navbar";
import AILibrarian from "./components/AILibrarian";
import ProtectedRoute from "./components/ProtectedRoute";
import Cart from "./components/Cart";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookDetails from "./pages/BookDetails";
import MyLibrary from "./pages/MyLibrary";
import BookReader from "./pages/BookReader";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBooks from "./pages/AdminBooks";
import AdminUsers from "./pages/AdminUsers";
import AdminRentals from "./pages/AdminRentals";
import Shop from "./pages/Shop";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Contact from "./pages/Contact";

const AppLayout = () => {
  const location = useLocation();
  const isReaderPage = location.pathname.startsWith("/reader/");
  const { t, i18n } = useTranslation();
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await axios.get("/api/books");
        setBooks(data);
      } catch (err) {
        console.error("Assistant books fetch failed", err);
      }
    };
    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col font-sans transition-colors duration-200">
      {!isReaderPage && <Navbar />}
      {!isReaderPage && <AILibrarian allBooks={books} />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/contact" element={<Contact />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/my-library" element={<MyLibrary />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reader/:bookId" element={<BookReader />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/books" element={<AdminBooks />} />
            <Route path="/admin/rentals" element={<AdminRentals />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            
          </Route>
        </Routes>
      </main>

      {!isReaderPage && (
        <footer className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 py-16 mt-auto border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex flex-col md:flex-row justify-between items-center gap-10 ${i18n.language === 'ar' ? 'rtl' : ''}`}>
              <div className="flex flex-col items-center md:items-start space-y-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white text-xl">📚</span>
                  </div>
                  <span className="font-extrabold text-2xl tracking-tighter text-gray-900 dark:text-white">Book<span className="text-primary">Verse</span></span>
                </div>
                <p className="text-sm font-medium max-w-xs text-center md:text-left opacity-80">{t("footer_text") || "Your next favorite book is just a click away."}</p>
              </div>

              <div className="flex flex-col items-center md:items-end space-y-6">
                <div className="flex space-x-8 rtl:space-x-reverse text-[10px] font-black uppercase tracking-[0.2em]">
                  <a href="#" className="hover:text-primary transition-colors">{t("terms") || "Terms"}</a>
                  <a href="#" className="hover:text-primary transition-colors">{t("privacy") || "Privacy"}</a>
                  <a href="#" className="hover:text-primary transition-colors">{t("nav_contact") || "Contact"}</a>
                </div>
                
                <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">f</div>
                   <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">t</div>
                   <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">i</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-900 mt-12 pt-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">&copy; {new Date().getFullYear()} BookVerse Digital. {t("all_rights_reserved")}</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppLayout />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

