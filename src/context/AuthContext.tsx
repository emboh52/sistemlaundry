"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: any;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("[AuthContext] Provider mounted, memulakan listener Firebase Auth...");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("[AuthContext] Firebase Auth berubah state:", firebaseUser ? `User terdeteksi: ${firebaseUser.email}` : "Tidak ada user login");

      if (firebaseUser) {
        try {
          console.log(`[AuthContext] Membaca data Firestore untuk UID: ${firebaseUser.uid}...`);
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            console.log("[AuthContext] Dokumen user ditemukan di Firestore:", userDoc.data());
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() });
          } else {
            console.warn("[AuthContext] Dokumen user TIDAK ditemukan di Firestore, menggunakan data fallback.");
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || "Admin", role: "Admin" });
          }
        } catch (error) {
          console.error("[AuthContext] Error saat membaca Firestore:", error);
          console.log("[AuthContext] Mengaplikasikan fallback user agar UI tidak tertahan.");
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: "Admin", role: "Admin" });
        }
      } else {
        setUser(null);
        // Otomatis tendang ke /admin/login jika user tidak login dan berada di luar halaman /admin/login
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        }
      }

      console.log("[AuthContext] Mengubah status loading -> FALSE");
      setLoading(false);
    });

    return () => {
      console.log("[AuthContext] Cleaning up listener Firebase Auth.");
      unsubscribe();
    };
  }, [router, pathname]);

  const logout = async () => {
    console.log("[AuthContext] Proses logout dimulai...");
    try {
      await firebaseSignOut(auth);
      setUser(null);
      console.log("[AuthContext] Logout berhasil, mengarahkan ke /admin/login...");
      
      // Direct redirect ke halaman login
      router.push("/admin/login");
    } catch (error) {
      console.error("[AuthContext] Logout gagal:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);