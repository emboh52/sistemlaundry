"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, addDoc } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, AlertTriangle, X, Loader2 } from "lucide-react";

interface InventoryItem {
  id: string;
  name?: string;
  stockQty?: number;
  unit?: string;
  minStock?: number;
  tenantId?: string;
}

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const tenantId = (user as any)?.tenantId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", stockQty: 10, unit: "Pcs", minStock: 5 });

  // Query Data Inventori (Terisolasi per tenantId dengan penjagaan authLoading)
  const inventoryQuery = useMemo(() => {
    if (authLoading || !tenantId) return null;
    return query(collection(db, "inventory"), where("tenantId", "==", tenantId));
  }, [authLoading, tenantId]);

  const { data: inventory = [], loading } = useFirestoreQuery<InventoryItem>(inventoryQuery);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      alert("Tenant ID tidak ditemukan. Silakan login ulang.");
      return;
    }

    try {
      await addDoc(collection(db, "inventory"), {
        ...form,
        stockQty: Number(form.stockQty),
        minStock: Number(form.minStock),
        tenantId: tenantId,
      });
      setIsModalOpen(false);
      setForm({ name: "", stockQty: 10, unit: "Pcs", minStock: 5 });
    } catch (error) {
      alert("Gagal menambah barang!");
    }
  };

  if (authLoading || !tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Stok</h1>
            <p className="text-sm text-slate-500">Kelola inventori dan bahan operasional laundry.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Item</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data stok...</div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada barang di inventori.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">NAMA BARANG</th>
                    <th className="p-4">STOK SAAT INI</th>
                    <th className="p-4">BATAS MINIMUM</th>
                    <th className="p-4">STATUS STOK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {inventory.map((item) => {
                    const isLow = (item.stockQty || 0) <= (item.minStock || 5);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-800">{item.name || "Tanpa Nama"}</td>
                        <td className="p-4 font-bold text-slate-900">{item.stockQty || 0} {item.unit || "Pcs"}</td>
                        <td className="p-4 text-slate-600">{item.minStock || 5} {item.unit || "Pcs"}</td>
                        <td className="p-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5" /> Menipis
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">Aman</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH STOK */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Tambah Item Inventori</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Deterjen Kiloan, Plastik, dll"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah Stok</label>
                  <input
                    type="number"
                    required
                    value={form.stockQty}
                    onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })}
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
                    placeholder="Pcs, Liter, Kg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min. Stok</label>
                  <input
                    type="number"
                    required
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600">Batal</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium">Simpan Barang</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}