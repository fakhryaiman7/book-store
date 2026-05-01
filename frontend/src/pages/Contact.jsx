import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "../api/axios";
import { toast } from "react-hot-toast";

const Contact = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/contact", formData);
      toast.success(t("message_sent_success"));
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error(t("message_sent_error"));
    } finally {
      setLoading(false);
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <div className={`min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 transition-colors duration-300 ${isRtl ? "rtl" : "ltr"}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
            {t("contact_title")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            {t("contact_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-primary/20 duration-500"></div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative z-10">
              {t("contact_info")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-10 relative z-10">
              {t("contact_info_text")}
            </p>

            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl">
                  📍
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Our Office</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">123 Book Street, Knowledge City</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl">
                  📧
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Email Us</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">support@bookverse.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl">
                  📞
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Call Us</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">+1 (555) 000-0000</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              {['f', 't', 'i', 'l'].map((social) => (
                <div key={social} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-all cursor-pointer">
                  {social}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t("name_label")}
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t("email_label")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t("subject_label")}
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                  placeholder="How can we help?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t("message_label")}
                </label>
                <textarea
                  name="message"
                  required
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white resize-none"
                  placeholder="Tell us more about your request..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{t("send_message_btn")}</span>
                    <span className={isRtl ? "rotate-180" : ""}>→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
