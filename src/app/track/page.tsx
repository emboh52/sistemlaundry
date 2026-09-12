"use client";

import { useState } from "react";
import { collection, query, where, getDocs, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Loader2 } from "lucide-react";

const ORDER_STEPS = ["Diterima", "Dicuci", "Pengeringan", "Setrika", "Selesai", "Diambil"];

export default function TrackOrderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        or(
          where("orderNumber", "==", searchTerm.trim()),
          where("customerPhone", "==", searchTerm.trim())
        )
      );

      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      setOrders(results);
    } catch (error) {
      console.error("Error searching order:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
            CE
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">Lacak Status Laundry</h1>
          <p className="text-slate-500">Masukkan No. Pesanan atau No. WhatsApp Anda untuk melihat progress cucian</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: INV-20260308-01 atau 08123456789"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              required
            />
            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center justify-center" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {searched && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center text-slate-500">
                Tidak ditemukan pesanan dengan kata kunci tersebut.
              </div>
            ) : (
              orders.map((order) => {
                const currentStepIndex = ORDER_STEPS.indexOf(order.status);
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                    <div className="bg-sky-50/50 border-b border-slate-200 p-6 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-sky-900">Pesanan #{order.orderNumber}</h3>
                        <p className="text-sm text-slate-500">Nama: {order.customerName} | Layanan: {order.serviceName}</p>
                      </div>
                      <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-semibold rounded-full">
                        {order.status}
                      </span>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Pembayaran:</span>
                        <span className="font-bold text-slate-800">Rp {(order.totalAmount || 0).toLocaleString("id-ID")} ({order.paymentStatus})</span>
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3">Progress Pengerjaan</h4>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                          {ORDER_STEPS.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            return (
                              <div key={step} className={`p-2 rounded-lg text-center border text-xs font-medium ${isCompleted ? "bg-sky-600 text-white border-sky-600" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                                {step}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
