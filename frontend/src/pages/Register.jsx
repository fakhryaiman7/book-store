import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const redirect = location.search ? location.search.split("=")[1] : "/";

  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage(t("passwords_mismatch") || "Passwords do not match");
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setError(null);
    
    const result = await register(name, email, password);
    
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen py-24 px-4 sm:px-6 lg:px-12 flex items-center justify-center transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-gray-900 p-12 lg:p-16 rounded-[3.5rem] shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-700 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
        
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">✨</div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">{t("register_title") || "Create Account"}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">{t("register_subtitle") || "Join BookVerse today"}</p>
        </div>
        
        {message && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 p-6 rounded-3xl mb-8 animate-in slide-in-from-top-4 duration-500" role="alert">
            <p className="font-black text-[10px] uppercase tracking-widest mb-1">{t("attention") || "Attention"}</p>
            <p className="font-medium text-sm">{message}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-6 rounded-3xl mb-8 animate-in slide-in-from-top-4 duration-500" role="alert">
            <p className="font-black text-[10px] uppercase tracking-widest mb-1">{t("registration_failed") || "Registration Failed"}</p>
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 rtl:mr-4 rtl:ml-0" htmlFor="name">
              {t("name_label") || "Full Name"}
            </label>
            <input
              type="text"
              id="name"
              placeholder={t("name_placeholder") || "John Doe"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-800 rounded-[1.5rem] py-4 px-8 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-gray-900 focus:border-primary/20 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 rtl:mr-4 rtl:ml-0" htmlFor="email">
              {t("email_label") || "Email Address"}
            </label>
            <input
              type="email"
              id="email"
              placeholder={t("email_placeholder") || "name@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-800 rounded-[1.5rem] py-4 px-8 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-gray-900 focus:border-primary/20 transition-all duration-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 rtl:mr-4 rtl:ml-0" htmlFor="password">
                {t("password_label") || "Password"}
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-800 rounded-[1.5rem] py-4 px-6 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-gray-900 focus:border-primary/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-4 rtl:mr-4 rtl:ml-0" htmlFor="confirmPassword">
                {t("confirm_password_label") || "Confirm"}
              </label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-800 rounded-[1.5rem] py-4 px-6 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-white dark:focus:bg-gray-900 focus:border-primary/20 transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-5 px-8 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 mt-6 ${
              loading ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary text-white shadow-primary/30 hover:bg-opacity-95'
            }`}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div>
            ) : null}
            {loading ? t("registering") || 'Creating Account...' : t("register_btn") || 'Register'}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-gray-50 dark:border-gray-800 text-center space-y-4">
          <p className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
            {t("have_account") || "Have an Account?"}
          </p>
          <Link 
            to={redirect !== "/" ? `/login?redirect=${redirect}` : "/login"}
            className="text-primary font-black text-xs uppercase tracking-widest hover:underline transition-all block group"
          >
            <span className="inline-block mr-2 group-hover:-translate-x-1 transition-transform rtl:rotate-180">←</span>
            {t("login_instead_btn") || "Log in"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
