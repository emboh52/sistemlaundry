"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where,
  orderBy, 
  doc, 
  writeBatch, 
  increment, 
  serverTimestamp 
} from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, X, CheckCircle2, PackagePlus, Info, Loader2 } from "lucide-react";

interface ExpenseItem {
  id: string;
  title?: string;
  amount?: number;
  category?: string;
  itemName?: string;
  addedQty?: number;
  tenantId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stockQty: number;
  unit: string;
  minStock?: number;
  tenantId?: string;
}

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const tenantId = (user as any)?.tenantId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomItem, setIsCustomItem] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    category: "Bahan Baku",
    amount: 50000 as number | "",
    itemName: "",
    addedQty: "" as number | "",
    unit: "Liter",
  });

  // Query Daftar Pengeluaran (Terisolasi per tenantId & menunggu auth selesai)
  const expensesQuery = useMemo(() => {
    if (authLoading || !tenantId) return null;
    return query(collection(db, "expenses"), where("tenantId", "==", tenantId), orderBy("createdAt", "desc"));
  }, [authLoading, tenantId]);
  const { data: expenses = [], loading } = useFirestoreQuery<ExpenseItem>(expensesQuery);

  // Query Daftar Stok Bahan Baku dari Inventory (Terisolasi per tenantId)
  const inventoryQuery = useMemo(() => {
    if (authLoading || !tenantId) return null;
    return query(collection(db, "inventory"), where("tenantId", "==", tenantId));
  }, [authLoading, tenantId]);
  const { data: inventoryList = [] } = useFirestoreQuery<InventoryItem>(inventoryQuery);

  // Cek apakah item yang dipilih/diketik sudah terdaftar di database stok
  const matchedExistingItem = useMemo(() => {
    if (!form.itemName.trim() || isCustomItem) return null;
    return inventoryList.find(
      (item) => item.name.toLowerCase() === form.itemName.trim().toLowerCase()
    );
  }, [form.itemName, inventoryList, isCustomItem]);

  // Handler saat dropdown inventory dipilih
  const handleInventorySelect = (selectedName: string) => {
    if (selectedName === "__NEW__") {
      setIsCustomItem(true);
      setForm((prev) => ({ ...prev, itemName: "", unit: "Liter" }));
      return;
    }

    setIsCustomItem(false);
    const matched = inventoryList.find((item) => item.name === selectedName);
    
    setForm((prev) => ({
      ...prev,
      itemName: selectedName,
      unit: matched ? matched.unit : prev.unit,
    }));
  };

  // Submit Handler: Menambah Pengeluaran & Update/Tambah Stok secara Atomic (Batch)
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      alert("Tenant ID tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (!form.title || !form.amount) return;

    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);
      const trimmedItemName = form.itemName.trim();
      const addedQtyNum = Number(form.addedQty) || 0;
      let targetInventoryId: string | null = null;

      // 1. LOGIKA PENYESUAIAN STOK (Hanya jika kategori Bahan Baku dan item diisi)
      if (form.category === "Bahan Baku" && trimmedItemName && addedQtyNum > 0) {
        if (matchedExistingItem) {
          // A. JIKA ITEM SUDAH ADA DI INVENTORI -> Tambah Stok Lama (+increment)
          targetInventoryId = matchedExistingItem.id;
          const invRef = doc(db, "inventory", matchedExistingItem.id);
          batch.update(invRef, {
            stockQty: increment(addedQtyNum),
            updatedAt: serverTimestamp(),
          });
        } else {
          // B. JIKA ITEM BARU -> Buat Dokumen Stok Baru di "inventory" dengan tenantId
          const newInvRef = doc(collection(db, "inventory"));
          targetInventoryId = newInvRef.id;
          batch.set(newInvRef, {
            name: trimmedItemName,
            stockQty: addedQtyNum,
            unit: form.unit || "Pcs",
            minStock: 5,
            tenantId: tenantId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 2. SIMPAN CATATAN PENGELUARAN KE "expenses" DENGAN tenantId
      const expenseRef = doc(collection(db, "expenses"));
      batch.set(expenseRef, {
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        inventoryId: targetInventoryId,
        itemName: form.category === "Bahan Baku" && trimmedItemName ? trimmedItemName : null,
        addedQty: form.category === "Bahan Baku" ? addedQtyNum : 0,
        tenantId: tenantId,
        createdAt: serverTimestamp(),
      });

      // Jalankan seluruh proses serentak
      await batch.commit();

      // Reset Modal & Form
      setIsModalOpen(false);
      setIsCustomItem(false);
      setForm({
        title: "",
        category: "Bahan Baku",
        amount: 50000,
        itemName: "",
        addedQty: "",
        unit: "Liter",
      });
    } catch (error) {
      console.error(error);
      alert("Gagal mencatat pengeluaran!");
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-2xl font-bold text-slate-800">Pengeluaran Operasional</h1>
            <p className="text-sm text-slate-500">Catat biaya operasional seperti listrik, air, detergent, gaji, dll.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>

        {/* TABEL CATATAN PENGELUARAN */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat catatan pengeluaran...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada catatan pengeluaran.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">KETERANGAN / DOKUMEN</th>
                    <th className="p-4">KATEGORI</th>
                    <th className="p-4">PENAMBAHAN STOK</th>
                    <th className="p-4">JUMLAH (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{exp.title || "Pengeluaran"}</td>
                      <td className="p-4 text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                          {exp.category || "Umum"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {exp.itemName ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            +{exp.addedQty} {exp.itemName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-rose-600">
                        - Rp {(exp.amount || 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CATAT PENGELUARAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Catat Pengeluaran Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-sm">
              {/* Keterangan Pengeluaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan Biaya</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Pembelian Deterjen, Bayar Listrik, dll"
                />
              </div>

              {/* Kategori & Nominal Biaya */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Gaji">Gaji Staf</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : "" })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                  />
                </div>
              </div>

              {/* SECTION PENYESUAIAN STOK (Hanya muncul jika Kategori = Bahan Baku) */}
              {form.category === "Bahan Baku" && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700">
                      Tambah Otomatis ke Stok Bahan Baku
                    </label>

                    {/* Badges Indikator */}
                    {matchedExistingItem ? (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Stok Terdaftar
                      </span>
                    ) : isCustomItem ? (
                      <span className="text-[11px] text-sky-600 font-semibold flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        <PackagePlus className="h-3 w-3" /> Item Baru
                      </span>
                    ) : null}
                  </div>

                  {/* Dropdown / Input Pemilihan Item dari Inventory */}
                  <div>
                    {!isCustomItem ? (
                      <div className="space-y-2">
                        <select
                          value={form.itemName}
                          onChange={(e) => handleInventorySelect(e.target.value)}
                          className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
                        >
                          <option value="">-- Pilih dari Daftar Inventori --</option>
                          {inventoryList.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} (Stok: {item.stockQty} {item.unit})
                            </option>
                          ))}
                          <option value="__NEW__" className="font-semibold text-sky-600">
                            + Tambah Item Bahan Baku Baru...
                          </option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Masukkan nama item baru:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomItem(false);
                              setForm((prev) => ({ ...prev, itemName: "" }));
                            }}
                            className="text-xs text-sky-600 hover:underline font-semibold"
                          >
                            ← Kembali ke Daftar
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={form.itemName}
                          onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                          placeholder="Contoh: Pewangi Downy, Plastik Packing..."
                          className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Jika item sudah dipilih atau diisi, tampilkan Jumlah & Satuan */}
                  {form.itemName.trim() && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah Dibeli</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Kuantitas"
                          value={form.addedQty}
                          onChange={(e) => setForm({ ...form, addedQty: e.target.value ? Number(e.target.value) : "" })}
                          className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan</label>
                        {matchedExistingItem && !isCustomItem ? (
                          <input
                            type="text"
                            disabled
                            value={matchedExistingItem.unit}
                            className="w-full border rounded-lg p-2.5 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                          />
                        ) : (
                          <select
                            value={form.unit}
                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                          >
                            <option value="Liter">Liter</option>
                            <option value="ml">ml</option>
                            <option value="Kg">Kg</option>
                            <option value="Gram">Gram</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Botol">Botol</option>
                            <option value="Packs">Packs</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {matchedExistingItem && !isCustomItem && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      Stok saat ini: <strong>{matchedExistingItem.stockQty} {matchedExistingItem.unit}</strong>. Akan bertambah otomatis setelah disimpan.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Catat Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}