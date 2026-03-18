import { useState, useEffect, useMemo } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";

const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "customer", phone: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const ROLES = useMemo(() => [
    { label: t("role_customer") || "Customer", value: "customer" },
    { label: t("role_admin") || "Admin", value: "admin" },
  ], [t]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("id, name, email, role, is_admin, phone, is_active, created_at").order("created_at", { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => { setForm({ name: "", email: "", role: "customer", phone: "", is_active: true }); setEditId(null); setError(null); setShowModal(true); };
  const openEdit = (u) => { setForm({ name: u.name, email: u.email, role: u.role || (u.is_admin ? "admin" : "customer"), phone: u.phone || "", is_active: u.is_active ?? true }); setEditId(u.id); setError(null); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone, is_admin: form.role === "admin", is_active: form.is_active, updated_at: new Date().toISOString() };
    let err;
    if (editId) {
      ({ error: err } = await supabase.from("users").update(payload).eq("id", editId));
    } else {
      // For adding users from admin panel, we need a password hash — use placeholder
      const bcryptPlaceholder = "$2a$10$placeholder_admin_created_user";
      ({ error: err } = await supabase.from("users").insert([{ ...payload, password: bcryptPlaceholder }]));
    }
    if (err) { setError(err.message); }
    else { setSuccess(editId ? "User updated!" : "User created!"); setShowModal(false); fetchUsers(); }
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDelete = async () => {
    const { error: err } = await supabase.from("users").delete().eq("id", deleteId);
    if (!err) { setSuccess("User deleted!"); fetchUsers(); }
    setDeleteId(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const toggleActive = async (user) => {
    await supabase.from("users").update({ is_active: !user.is_active }).eq("id", user.id);
    fetchUsers();
  };

  const fmt = (d) => {
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col md:flex-row transition-colors duration-200">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 animate-in slide-in-from-left duration-500">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t("users") || "Users"}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{users.length} {t("registered_users") || "registered users"}</p>
          </div>
          <button onClick={openAdd} className="bg-primary text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-primary/20 hover:bg-opacity-90 transition-all active:scale-95 flex items-center space-x-2 rtl:space-x-reverse text-sm uppercase tracking-widest">
            <span>+</span><span>{t("add_user") || "Add User"}</span>
          </button>
        </div>

        {success && <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 p-4 rounded-xl shadow-sm font-bold text-sm animate-in slide-in-from-top">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-xl shadow-sm font-bold text-sm animate-in slide-in-from-top">{error}</div>}

        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-primary-pale border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("loading") || "Loading..."}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-32 text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t("no_users_found") || "No users found."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                  <tr>
                    {[t("col_name")||"Name", t("col_email")||"Email", t("col_role")||"Role", t("col_phone")||"Phone", t("col_status")||"Status", t("col_joined")||"Joined", t("col_actions")||"Actions"].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left rtl:text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-light font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                            {u.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${(u.role === "admin" || u.is_admin) ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"}`}>
                          {u.role || (u.is_admin ? "admin" : "customer")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">{u.phone || "—"}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleActive(u)} className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider transition-all ${u.is_active !== false ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100"}`}>
                          {u.is_active !== false ? t("status_active")||"Active" : t("status_inactive")||"Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500">{fmt(u.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)} className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(u.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20 dark:border-gray-800">
            <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-t-[2.5rem]">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editId ? t("edit_user") : t("add_user")}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-xl shadow-sm font-bold text-xs">{error}</div>}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{t("form_fullname") || "Full Name"}</label>
                <input required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none dark:text-white transition-all font-bold"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{t("form_email") || "Email"}</label>
                <input type="email" required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none dark:text-white transition-all font-bold"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{t("form_phone") || "Phone"}</label>
                <input className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none dark:text-white transition-all font-bold"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{t("form_role") || "Role"}</label>
                <select required className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm outline-none dark:text-white font-bold appearance-none cursor-pointer"
                  value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <label className="flex items-center space-x-3 cursor-pointer group px-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5 accent-primary rounded-lg" />
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">{t("status_active") || "Active"}</span>
              </label>
              <div className="flex justify-end gap-4 pt-10 border-t dark:border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors font-bold">{t("btn_cancel") || "Cancel"}</button>
                <button type="submit" disabled={saving} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-opacity-90 active:scale-95 disabled:opacity-50 transition-all">
                  {saving ? "..." : editId ? t("btn_save") : t("btn_add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/10">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 text-3xl">👤</div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{t("delete_user") || "Delete User?"}</h3>
            <p className="text-gray-400 font-medium text-sm mb-10">{t("delete_user_msg") || "This will permanently remove the user and all linked data."}</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400">{t("btn_cancel")||"Cancel"}</button>
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20">{t("btn_delete")||"Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
