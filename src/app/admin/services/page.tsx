"use client";

import { useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, X, Pencil, Trash2 } from "lucide-react";

interface ServiceItem {
  id: string;
  name?: string;
  price?: number;
  unit?: string;
  duration?: string;
}

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: 7000, unit: "Kg", duration: "1 Hari" });

  const servicesQuery = useMemo(() => query(collection(db, "services")), []);
  const { data: services = [], loading } = useFirestoreQuery<ServiceItem>(servicesQuery);

  // Buka Modal untuk Tambah Baru
  const handleOpenAddModal = () => {
    setEditingId(null);
    setForm({ name: "", price: 7000, unit: "Kg", duration: "1 Hari" });
    setIsModalOpen(true);
  };

  // Buka Modal untuk Edit Data
  const handleOpenEditModal = (srv: ServiceItem) => {
    setEditingId(srv.id);
    setForm({
      name: srv.name || "",
      price: srv.price || 0,
      unit: srv.unit || "Kg",
      duration: srv.duration || "1 Hari",
    });
    setIsModalOpen(true);
  };

  // Submit Tambah / Edit
  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Logika Update (Edit)
        const serviceRef = doc(db, "services", editingId);
        await updateDoc(serviceRef, {
          ...form,
          price: Number(form.price),
        });
      } else {
        // Logika Create (Tambah Baru)
        await addDoc(collection(db, "services"), {
          ...form,
          price: Number(form.price),
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setForm({ name: "", price: 7000, unit: "Kg", duration: "1 Hari" });
    } catch (error) {
      alert(editingId ? "Gagal memperbarui layanan!" : "Gagal menambah layanan!");
    }
  };

  // Hapus Layanan
  const handleDeleteService = async (id: string, name?: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus layanan "${name || "ini"}"?`)) return;
    try {
      await deleteDoc(doc(db, "services", id));
    } catch (error) {
      alert("Gagal menghapus layanan!");
    }
  };

  return (
    <div className="p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Layanan & Paket</h1>
            <p className="text-sm text-slate-500">Atur jenis layanan cuci, harga, dan durasi pengerjaan.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Layanan</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat layanan...</div>
          ) : services.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada paket/layanan terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">NAMA LAYANAN</th>
                    <th className="p-4">HARGA</th>
                    <th className="p-4">SATUAN</th>
                    <th className="p-4">ESTIMASI WAKTU</th>
                    <th className="p-4 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{srv.name || "-"}</td>
                      <td className="p-4 font-bold text-slate-900">Rp {(srv.price || 0).toLocaleString("id-ID")}</td>
                      <td className="p-4 text-slate-600">{srv.unit || "Kg"}</td>
                      <td className="p-4 text-slate-600">{srv.duration || "1 Hari"}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(srv)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Layanan"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(srv.id, srv.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Layanan"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* MODAL TAMBAH / EDIT LAYANAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Layanan" : "Tambah Layanan Baru"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitService} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Layanan</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Cuci Express 3 Jam, Cuci Bedcover, dll"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Durasi</label>
                  <input
                    type="text"
                    required
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium">
                  {editingId ? "Simpan Perubahan" : "Simpan Layanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}