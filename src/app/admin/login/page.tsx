"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [fetchingTenants, setFetchingTenants] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // State penahan loading awal
  const router = useRouter();

  // Cek status auth saat pertama kali halaman dimuat
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "SuperAdmin") {
            router.replace("/super-admin/dashboard");
          } else {
            router.replace("/admin/dashboard");
          }
        } catch (err) {
          router.replace("/admin/dashboard");
        }
      } else {
        setCheckingAuth(false); // Hanya tampilkan form jika user fix belum login
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Ambil daftar tenant dari Firestore saat halaman dimuat
  useEffect(() => {
    async function fetchTenants() {
      try {
        const querySnapshot = await getDocs(collection(db, "tenants"));
        const tenantList: any[] = [];
        querySnapshot.forEach((doc) => {
          tenantList.push({
            id: doc.id,
            name: doc.data().name || doc.id,
          });
        });
        setTenants(tenantList);
        if (tenantList.length > 0) {
          setSelectedTenantId(tenantList[0].id);
        }
      } catch (err) {
        console.error("Gagal memuat daftar tenant:", err);
      } finally {
        setFetchingTenants(false);
      }
    }
    fetchTenants();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Cek role user di Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "SuperAdmin") {
        router.replace("/super-admin/dashboard");
        return;
      }

      // Jika bukan Super Admin, wajib pilih tenant
      if (!selectedTenantId) {
        throw new Error("Silakan pilih cabang / toko terlebih dahulu.");
      }
      
      // Simpan tenant yang dipilih ke localStorage untuk isolasi data multi-tenant
      localStorage.setItem("activeTenantId", selectedTenantId);
      router.replace("/admin/dashboard");

    } catch (err: any) {
      setError(err.message || "Email atau password salah.");
      setIsSubmitting(false);
    }
  };

  // Tampilkan layar memuat sementara agar form tidak berkedip saat pertama kali dibuka
  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-slate-600 font-medium text-sm">Memeriksa sesi login...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-lg bg-blue-800 p-8 shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-white">Login Admin</h2>
        
        {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">{error}</div>}

        {/* Pilihan Tenant / Cabang Toko */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-white">Pilih Cabang / Toko</label>
          {fetchingTenants ? (
            <div className="text-sm text-white/70">Memuat daftar toko...</div>
          ) : tenants.length === 0 ? (
            <div className="text-sm text-amber-200">Belum ada tenant terdaftar.</div>
          ) : (
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full rounded border px-3 py-2 outline-none focus:border-blue-500 text-slate-800 bg-white"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-white">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 outline-none focus:border-blue-500 text-slate-800"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-white">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 outline-none focus:border-blue-500 text-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || fetchingTenants}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {isSubmitting ? "Memproses..." : "Masuk ke Dashboard"}
        </button>
      </form>
    </div>
  );
}