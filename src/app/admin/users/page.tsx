"use client";

import { useState, useMemo } from "react";
import { db, firebaseConfig } from "@/lib/firebase";
import { collection, query, updateDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, UserCheck, X, Lock } from "lucide-react";

interface UserItem {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
}

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Kasir" });

  const usersQuery = useMemo(() => query(collection(db, "users")), []);
  const { data: users = [], loading } = useFirestoreQuery<UserItem>(usersQuery);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
    } catch (error) {
      alert("Gagal memperbarui role!");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;

    setIsSubmitting(true);
    let secondaryUser: any = null;

    try {
      // 1. Instance Firebase Secondary
      const secondaryApp =
        getApps().find((app) => app.name === "SecondaryApp") ||
        initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Buat Akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        form.email.trim(),
        form.password
      );
      secondaryUser = userCredential.user;

      // 3. Simpan Profil ke Firestore (Menggunakan Primary App di mana Admin sedang Login)
      await setDoc(doc(db, "users", secondaryUser.uid), {
        uid: secondaryUser.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: "Aktif",
        createdAt: serverTimestamp(),
      });

      // 4. Logout dari Secondary Auth
      await signOut(secondaryAuth);

      alert(`Karyawan ${form.name} berhasil didaftarkan!`);
      setIsModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "Kasir" });
    } catch (error: any) {
      console.error("Error adding user:", error);

      // 🔄 ROLLBACK: Jika simpan ke Firestore gagal, hapus akun Auth yang terlanjur dibuat
      if (secondaryUser) {
        try {
          await secondaryUser.delete();
          console.log("Rollback berhasil: User Auth dihapus kembali.");
        } catch (deleteError) {
          console.error("Gagal melakukan rollback user auth:", deleteError);
        }
      }

      alert(`Gagal membuat user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Staf & Akses (RBAC)</h1>
            <p className="text-sm text-slate-500">Kelola akun karyawan, kasir, dan tingkat hak akses sistem.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Karyawan</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data staf...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada karyawan / staf terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">NAMA STAF</th>
                    <th className="p-4">EMAIL</th>
                    <th className="p-4">HAK AKSES (ROLE)</th>
                    <th className="p-4">STATUS AKUN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{u.name || "Staf CleanExpress"}</td>
                      <td className="p-4 text-slate-600">{u.email || "-"}</td>
                      <td className="p-4">
                        <select
                          value={u.role || "Kasir"}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="Admin">Admin (Full Control)</option>
                          <option value="Kasir">Kasir (POS & Order)</option>
                          <option value="Kurir">Kurir (Pickup / Delivery)</option>
                          <option value="Produksi">Operator Cuci / Setrika</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                          <UserCheck className="h-3.5 w-3.5" />
                          {u.status || "Aktif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH KARYAWAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Tambah Staf Karyawan</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Login</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="staf@cleanexpress.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password Awal (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border rounded-lg p-2.5 pl-9 outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="••••••••"
                  />
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role / Jabatan</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="Kasir">Kasir (POS & Order)</option>
                  <option value="Kurir">Kurir (Pickup / Delivery)</option>
                  <option value="Produksi">Operator Cuci / Setrika</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Mendaftarkan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}