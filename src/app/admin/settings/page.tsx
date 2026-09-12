"use client";

import { useState, useEffect } from "react";
import {
  getBusinessSettings,
  saveBusinessSettings,
  BusinessSettings,
} from "@/lib/settingsService";
import { Store, Phone, MapPin, FileText, Printer, Save, Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [form, setForm] = useState<BusinessSettings>({
    name: "",
    address: "",
    phone: "",
    receiptFooter: "",
    paperSize: "58mm",
  });

  // Execute: Perintah Ambil Data Pengaturan
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getBusinessSettings();

        if (data) {
          setForm(data);
        } else {
          // Default nilai awal jika dokumen belum ada di Firestore
          setForm({
            name: "LALA LAUNDRY",
            address: "Jl. Merdeka No. 45, Jakarta",
            phone: "081234567890",
            receiptFooter: "Terima kasih atas kunjungan Anda!",
            paperSize: "58mm",
          });
        }
      } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Execute: Perintah Simpan Pengaturan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await saveBusinessSettings(form);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
      alert("Gagal menyimpan pengaturan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Toko & Struk</h1>
        <p className="text-sm text-slate-500">
          Kelola informasi profil usaha dan tampilan cetak struk pembayaran.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Pengaturan (Kolom Kiri) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b pb-3">
              <Store className="w-4 h-4 text-sky-600" /> Profil Usaha
            </h2>

            {/* Nama Toko */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Usaha / Toko
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: LALA LAUNDRY"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* No Telepon */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                No. Telepon / WhatsApp Toko
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alamat Usaha
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Alamat lengkap toko"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 border-b pb-3 pt-4">
              <Printer className="w-4 h-4 text-sky-600" /> Konfigurasi Struk
            </h2>

            {/* Ukuran Kertas */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ukuran Kertas Thermal Printer
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperSize: "58mm" })}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    form.paperSize === "58mm"
                      ? "border-sky-600 bg-sky-50 text-sky-700 font-bold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Printer className="w-4 h-4" /> 58mm (Standar Kasir)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperSize: "80mm" })}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    form.paperSize === "80mm"
                      ? "border-sky-600 bg-sky-50 text-sky-700 font-bold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Printer className="w-4 h-4" /> 80mm (Lebar)
                </button>
              </div>
            </div>

            {/* Pesan Footer Struk */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Pesan Catatan Kaki (Footer)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Contoh: Barang yang sudah diambil tidak dapat ditukar"
                  className="w-full border border-slate-200 rounded-xl p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-4 flex items-center justify-between">
              {showSuccessToast && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                  <Check className="w-4 h-4" /> Pengaturan berhasil disimpan!
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="ml-auto bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Struk Thermal */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Live Preview Struk Thermal ({form.paperSize})
          </p>
          <div
            className={`bg-amber-50/50 border border-amber-200/80 p-4 rounded-xl shadow-md text-slate-900 font-mono text-xs transition-all ${
              form.paperSize === "58mm" ? "w-[240px]" : "w-[320px]"
            }`}
          >
            <div className="text-center font-bold text-sm uppercase">{form.name || "NAMA TOKO"}</div>
            <div className="text-center text-[10px] text-slate-600 mt-0.5 leading-tight">
              {form.address || "Alamat Toko Anda"}
            </div>
            <div className="text-center text-[10px] text-slate-600 mt-0.5">
              Telp/WA: {form.phone || "08xxxxxxx"}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="flex justify-between text-[11px]">
              <span>No. Order:</span>
              <span className="font-bold">#CE-8821</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Pelanggan:</span>
              <span>Budi Santoso</span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="flex justify-between font-bold my-1 text-[11px]">
              <span>Cuci Komplit (3 Kg)</span>
              <span>Rp 21.000</span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="flex justify-between text-[11px]">
              <span>Status Bayar:</span>
              <span className="font-semibold text-emerald-700">Lunas</span>
            </div>
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>TOTAL:</span>
              <span>Rp 21.000</span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="text-center mt-3 text-[10px] text-slate-600 leading-tight">
              {form.receiptFooter || "Terima kasih atas kunjungan Anda!"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}