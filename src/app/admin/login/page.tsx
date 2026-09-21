"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // State penahan loading awal
  const router = useRouter();

  // Cek status auth saat pertama kali halaman dimuat
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/admin/dashboard");
      } else {
        setCheckingAuth(false); // Hanya tampilkan form jika user fix belum login
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigasi tidak perlu dipanggil di sini lagi karena sudah 
      // otomatis ditangani oleh onAuthStateChanged di useEffect di atas.
    } catch (err: any) {
      setError("Email atau password salah.");
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
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {isSubmitting ? "Memproses..." : "Masuk ke Dashboard"}
        </button>
      </form>
    </div>
  );
}