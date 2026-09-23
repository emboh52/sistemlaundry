"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext"; // 1. Import useAuth
import { db } from "@/lib/firebase";
import { collection, query, addDoc, where, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, X, History, ShoppingBag, Loader2, Eye, Pencil, Trash2 } from "lucide-react";

interface CustomerItem {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  tenantId?: string;
}

interface OrderItem {
  id: string;
  createdAt?: any;
  totalAmount?: number;
  status?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  serviceName?: string;
  [key: string]: any;
}

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth(); // 2. Ambil user & loading dari AuthContext
  const tenantId = (user as any)?.tenantId; // 3. Ambil tenantId langsung dari dokumen user di Firestore

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  // State untuk Modal Riwayat Order
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // State untuk Fitur View, Edit, dan Delete
  const [viewCustomer, setViewCustomer] = useState<CustomerItem | null>(null);
  const [editCustomer, setEditCustomer] = useState<CustomerItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // 4. Query Data Pelanggan (Menunggu Auth selesai & tenantId siap)
  const customersQuery = useMemo(() => {
    if (authLoading || !tenantId) return null;
    return query(collection(db, "customers"), where("tenantId", "==", tenantId));
  }, [authLoading, tenantId]);

  const { data: customers = [], loading } = useFirestoreQuery<CustomerItem>(customersQuery);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      alert("Tenant ID tidak ditemukan. Silakan login ulang.");
      return;
    }
    try {
      await addDoc(collection(db, "customers"), {
        ...form,
        tenantId: tenantId,
      });
      setIsModalOpen(false);
      setForm({ name: "", phone: "", address: "" });
    } catch (error) {
      alert("Gagal menambah pelanggan!");
    }
  };

  // Fungsi untuk mengambil riwayat pesanan berdasarkan ID Pelanggan dan tenantId
  const handleViewHistory = async (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
    setIsLoadingOrders(true);

    try {
      if (!tenantId) return;
      
      const q = query(
        collection(db, "orders"),
        where("tenantId", "==", tenantId),
        where("customerName", "==", customer.name || "")
      );

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as OrderItem[];

      // Urutkan transaksi dari yang terbaru secara lokal
      orders.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setCustomerOrders(orders);
    } catch (error) {
      console.error("Gagal mengambil riwayat order:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // HANDLER EDIT PELANGGAN
  const handleOpenEdit = (customer: CustomerItem) => {
    setEditCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;

    try {
      setIsSubmittingEdit(true);
      await updateDoc(doc(db, "customers", editCustomer.id), {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
      });

      alert("Data pelanggan berhasil diperbarui!");
      setEditCustomer(null);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      alert(`Gagal memperbarui pelanggan: ${error.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // HANDLER DELETE PELANGGAN
  const handleDeleteCustomer = async (customerId: string, customerName?: string) => {
    const isConfirmed = confirm(
      `Apakah Anda yakin ingin menghapus pelanggan "${customerName || "ini"}"?`
    );

    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "customers", customerId));
      alert("Data pelanggan berhasil dihapus!");
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      alert(`Gagal menghapus pelanggan: ${error.message}`);
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
            <h1 className="text-2xl font-bold text-slate-800">Data Pelanggan</h1>
            <p className="text-sm text-slate-500">Kelola informasi kontak dan profil pelanggan.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Pelanggan Baru</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data pelanggan...</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada pelanggan terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">NAMA PELANGGAN</th>
                    <th className="p-4">NO. TELEPON / WA</th>
                    <th className="p-4">ALAMAT</th>
                    <th className="p-4 text-center">RIWAYAT ORDER</th>
                    <th className="p-4 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{c.name || "-"}</td>
                      <td className="p-4 text-slate-600">{c.phone || "-"}</td>
                      <td className="p-4 text-slate-600">{c.address || "-"}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewHistory(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-600 rounded-lg text-xs font-medium transition-colors border border-slate-200 hover:border-sky-200"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Lihat Riwayat</span>
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewCustomer(c)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Detail Pelanggan"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Pelanggan"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Pelanggan"
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

      {/* MODAL TAMBAH PELANGGAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Tambah Pelanggan Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp/HP</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="0812..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600">Batal</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium">Simpan Pelanggan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT ORDER */}
      {isHistoryOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-sky-600" />
                  <span>Riwayat Order</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pelanggan: <span className="font-semibold text-slate-700">{selectedCustomer.name}</span>
                </p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-sm">
              {isLoadingOrders ? (
                <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                  <span>Memuat riwayat transaksi...</span>
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  Belum ada riwayat transaksi untuk pelanggan ini.
                </div>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          #{order.id.slice(0, 8)}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {order.createdAt?.toDate
                            ? order.createdAt.toDate().toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        order.status === "Selesai"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {order.status || "Proses"}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 text-xs">
                      <p className="font-semibold text-slate-600 mb-1">Rincian Order:</p>
                      {order.items && order.items.length > 0 ? (
                        <ul className="space-y-1">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-slate-600">
                              <span>{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                              <span>Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-600">{order.serviceName || "Layanan Custom"}</p>
                      )}
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>Total Biaya</span>
                      <span className="text-emerald-600 text-sm">
                        Rp {(order.totalAmount || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 mt-3 text-right">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW DETAIL PELANGGAN */}
      {viewCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Detail Pelanggan</h2>
              <button onClick={() => setViewCustomer(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Nama Lengkap</span>
                <span className="font-semibold text-slate-800">{viewCustomer.name || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">No. Telepon / WA</span>
                <span className="text-slate-700">{viewCustomer.phone || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Alamat</span>
                <span className="text-slate-700 whitespace-pre-line">{viewCustomer.address || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">ID Pelanggan</span>
                <span className="text-xs font-mono bg-slate-100 p-1.5 rounded block text-slate-600 break-all">
                  {viewCustomer.id}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={() => setViewCustomer(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PELANGGAN */}
      {editCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Edit Data Pelanggan</h2>
              <button onClick={() => setEditCustomer(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp/HP</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setEditCustomer(null)} className="px-4 py-2 border rounded-lg text-slate-600">Batal</button>
                <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}