import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const countriesData = {
  Egypt: ["Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayoum", "Gharbia", "Ismailia", "Monufia", "Minya", "Qalyubia", "New Valley", "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai", "Sohag"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Abha", "Tabuk", "Buraidah", "Hail", "Jazan", "Najran", "Al Bahah", "Sakaka"],
  UAE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
  Jordan: ["Amman", "Zarqa", "Irbid", "Aqaba", "Madaba", "Salt", "Jerash", "Ma'an", "Mafraq", "Tafilah", "Karak", "Ajloun"],
  Kuwait: ["Al Asimah", "Hawalli", "Farwaniya", "Mubarak Al-Kabeer", "Ahmadi", "Jahra"],
};

const Profile = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    phone: "",
    birthDate: "",
    gender: "",
    country: "",
    province: "",
    address: "",
    avatarUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        firstName: user.firstName || "",
        phone: user.phone || "",
        birthDate: user.birthDate || "",
        gender: user.gender || "",
        country: user.country || "",
        province: user.province || "",
        address: user.address || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset province if country changes
      ...(name === "country" ? { province: "" } : {}),
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user._id || user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bookstream") // Assuming a bucket named 'bookstream' exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("bookstream")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, avatarUrl: publicUrl }));
      setMessage({ type: "success", text: t("avatar_uploaded") || "Avatar uploaded successfully" });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put("/api/auth/profile", formData, config);
      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setMessage({ type: "success", text: t("profile_updated") || "Profile updated successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm(t("delete_account_confirm") || "Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        await axios.delete("/api/auth/profile", config);
        logout();
        navigate("/");
      } catch (error) {
        setMessage({
          type: "error",
          text: error.response?.data?.message || error.message,
        });
      }
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <div className={`max-w-4xl mx-auto px-4 py-12 ${isRtl ? "rtl" : "ltr"}`}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="bg-primary h-32 relative">
           <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 sm:left-12 sm:translate-x-0">
             <div className="relative group">
               <img 
                 src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${formData.name}&background=random&size=128`} 
                 alt="Avatar" 
                 className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-900 object-cover shadow-lg"
               />
               <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                 <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                 <span className="text-xs font-bold uppercase tracking-wider">{uploading ? "..." : (t("change") || "Change")}</span>
               </label>
             </div>
           </div>
        </div>

        <div className="pt-16 pb-8 px-6 sm:px-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t("profile_settings") || "Profile Settings"}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{t("manage_profile_desc") || "Update your personal information and preferences."}</p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              {t("delete_account") || "Delete Account"}
            </button>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold ${message.type === "success" ? "bg-green-50 text-green-600 dark:bg-green-900/20" : "bg-red-50 text-red-600 dark:bg-red-900/20"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("full_name") || "Full Name"}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("first_name") || "First Name"}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("phone_number") || "Phone Number"}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("birth_date") || "Birth Date"}</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("gender") || "Gender"}</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              >
                <option value="">{t("select_gender") || "Select Gender"}</option>
                <option value="male">{t("male") || "Male"}</option>
                <option value="female">{t("female") || "Female"}</option>
              </select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("country") || "Country"}</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              >
                <option value="">{t("select_country") || "Select Country"}</option>
                {Object.keys(countriesData).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Province */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("province") || "Province/State"}</label>
              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                disabled={!formData.country}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">{t("select_province") || "Select Province"}</option>
                {formData.country && countriesData[formData.country]?.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("address") || "Detailed Address"}</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-12 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "..." : (t("save_changes") || "Save Changes")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
