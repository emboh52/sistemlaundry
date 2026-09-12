"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

// Daftar nama koleksi di Firestore yang ingin dibersihkan
const COLLECTIONS_TO_CLEAR = [
  "orders",      // Pesanan
  "expenses",    // Pengeluaran
  "customers",   // Pelanggan / Customers
  "services",    // Layanan
  "stocks",      // Stok / Stok Bahan / Produk
];

interface ResetDataModalProps {
  userRole?: string; // Menyimpan status role user (misal: "admin")
}

export default function ResetDataModal({ userRole = "admin" }: ResetDataModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Cek apakah user adalah Admin
  const isAdmin = userRole === "admin";

  // Fungsi untuk menghapus 1 koleksi dalam batch (maksimal 500 dokumen per batch)
  const clearCollection = async (collectionName: string) => {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) return;

    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
      count++;

      // Firebase membatasi maksimal 500 operasi per batch
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  };

  // Fungsi Eksekusi Hapus Semua Data
  const handleResetAllData = async () => {
    if (!isAdmin) {
      setErrorMessage("Akses ditolak. Hanya Admin yang dapat menghapus data!");
      return;
    }

    if (confirmText !== "HAPUS") {
      setErrorMessage("Kata konfirmasi tidak sesuai. Ketik 'HAPUS' untuk melanjutkan.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Jalankan penghapusan untuk setiap koleksi secara paralel
      await Promise.all(
        COLLECTIONS_TO_CLEAR.map((colName) => clearCollection(colName))
      );

      setSuccessMessage("Semua data pesanan, stok, layanan, pelanggan, dan pengeluaran berhasil dibersihkan!");
      setConfirmText("");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage("");
      }, 2500);
    } catch (err: any) {
      console.error("Gagal menghapus data:", err);
      setErrorMessage("Gagal menghapus data: " + (err.message || "Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  };

  // Jika bukan admin, tombol tidak ditampilkan atau di-disable
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {/* Tombol Pemicu di Halaman Admin/Pengaturan */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl font-medium text-sm transition-all shadow-sm"
      >
        <Trash2 className="h-4 w-4" />
        Reset / Hapus Semua Data Usaha
      </button>

      {/* Modal Popup Konfirmasi */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header Modal */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Bersihkan Semua Data?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tindakan ini akan menghapus <strong>permanen</strong> data: Pesanan, Pengeluaran, Stok, Layanan, dan Pelanggan.
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs space-y-1">
              <p className="font-semibold">⚠️ PERHATIAN:</p>
              <p>
                Gunakan fitur ini hanya jika ingin memulai usaha baru dengan sistem yang bersih. Data yang terhapus <strong>tidak dapat dikembalikan</strong>.
              </p>
            </div>

            {/* Input Konfirmasi */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">
                Ketik <span className="text-rose-600 font-bold">HAPUS</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik HAPUS di sini"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                disabled={loading}
              />
            </div>

            {/* Notifikasi Pesan Error / Sukses */}
            {errorMessage && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setErrorMessage("");
                  setConfirmText("");
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                disabled={loading || confirmText !== "HAPUS"}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
                  confirmText === "HAPUS" && !loading
                    ? "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Eksekusi Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}