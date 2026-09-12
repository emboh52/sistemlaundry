"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  PlusCircle,
  Receipt,
  PackagePlus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Package,
} from "lucide-react";
import Link from "next/link";
import ResetDataModal from "@/components/admin/ResetDataModal";

interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  serviceName?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: any;
}

interface InventoryItem {
  id: string;
  name: string;
  stockQty?: number;
  stock?: number;
  minStock?: number;
  unit: string;
}

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  itemName?: string;
  addedQty?: number;
  createdAt?: any;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Filter Periode (Hari Ini, 7 Hari Terakhir, Bulan Ini, Tahun Ini)
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "month" | "year">("month");

  // Query Firestore
  const ordersQuery = useMemo(() => query(collection(db, "orders"), orderBy("createdAt", "desc")), []);
  const inventoryQuery = useMemo(() => query(collection(db, "inventory")), []);
  const expensesQuery = useMemo(() => query(collection(db, "expenses"), orderBy("createdAt", "desc")), []);

  const { data: orders = [], loading: ordersLoading } = useFirestoreQuery<Order>(ordersQuery);
  const { data: inventory = [] } = useFirestoreQuery<InventoryItem>(inventoryQuery);
  const { data: expenses = [], loading: expensesLoading } = useFirestoreQuery<Expense>(expensesQuery);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/admin/login");
    }
  }, [user, authLoading, router]);

  // Helper untuk filter tanggal
  const filterByDate = (dateObj: Date | null) => {
    if (!dateObj) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeRange === "today") {
      return dateObj >= startOfToday;
    }
    if (timeRange === "7days") {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return dateObj >= sevenDaysAgo;
    }
    if (timeRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return dateObj >= startOfMonth;
    }
    if (timeRange === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return dateObj >= startOfYear;
    }
    return true;
  };

  // Metrik Kalkulasi Finansial
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const d = ord.createdAt?.toDate ? ord.createdAt.toDate() : null;
      return filterByDate(d);
    });
  }, [orders, timeRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = exp.createdAt?.toDate ? exp.createdAt.toDate() : null;
      return filterByDate(d);
    });
  }, [expenses, timeRange]);

  const totalIncome = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  }, [filteredOrders]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredExpenses]);

  const netProfit = totalIncome - totalExpense;

  // Barang dengan Stok Menipis
  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => {
      const currentStock = item.stockQty ?? item.stock ?? 0;
      const min = item.minStock ?? 5;
      return currentStock <= min;
    });
  }, [inventory]);

  // Data Kategori Pengeluaran untuk Donut / Bar Visual
  const expenseCategories = useMemo(() => {
    const categories: Record<string, number> = {
      "Bahan Baku": 0,
      "Operasional": 0,
      "Gaji": 0,
      "Lainnya": 0,
    };

    filteredExpenses.forEach((exp) => {
      const cat = exp.category || "Lainnya";
      if (categories[cat] !== undefined) {
        categories[cat] += exp.amount || 0;
      } else {
        categories["Lainnya"] += exp.amount || 0;
      }
    });

    return categories;
  }, [filteredExpenses]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 font-medium">
        Memverifikasi Sesi Admin...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans max-w-7xl mx-auto">
      {/* 1. HEADER & FILTER PERIODE TANGGAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-sm text-slate-500">
            Ringkasan performa operasional & keuangan toko kamu.
          </p>
        </div>

        {/* Dropdown Filter Periode */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm self-start">
          <Calendar className="h-4 w-4 text-slate-400 ml-2" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-sm font-semibold text-slate-700 bg-transparent outline-none pr-2 cursor-pointer"
          >
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>
      </div>

      {/* 2. TOMBOL AKSI CIKAT (QUICK ACTIONS) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/orders"
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Transaksi Baru</span>
        </Link>
        <Link
          href="/admin/expenses"
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <Receipt className="h-4 w-4" />
          <span>+ Catat Pengeluaran</span>
        </Link>
        <Link
          href="/admin/inventory"
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <PackagePlus className="h-4 w-4" />
          <span>+ Kelola Stok</span>
        </Link>

        {/* Modal Reset Data */}
        <ResetDataModal userRole="admin" />
      </div>

      {/* 3. KARTU METRIK UTAMA (KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Omzet / Pemasukan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pemasukan
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            Rp {totalIncome.toLocaleString("id-ID")}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> Pemasukan Tercatat
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            Rp {totalExpense.toLocaleString("id-ID")}
          </div>
          <div className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1">
            <ArrowDownRight className="h-3.5 w-3.5" /> Biaya Operasional
          </div>
        </div>

        {/* Keuntungan Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keuntungan Bersih
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              netProfit >= 0 ? "text-slate-800" : "text-rose-600"
            }`}
          >
            Rp {netProfit.toLocaleString("id-ID")}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            (Pemasukan - Pengeluaran)
          </div>
        </div>

        {/* Stok Menipis Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Stok Kritis
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {lowStockItems.length} <span className="text-sm font-normal text-slate-500">Item</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-semibold">
            {lowStockItems.length > 0 ? "Perlu Diisi Ulang!" : "Stok Aman"}
          </div>
        </div>
      </div>

      {/* 4. PERINGATAN STOK MENIPIS (LOW STOCK ALERT WIDGET) */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-amber-900 font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2>Item Bahan Baku Perlu Restok</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockItems.map((item) => {
              const currentStock = item.stockQty ?? item.stock ?? 0;
              return (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-amber-200/60 flex justify-between items-center text-sm shadow-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-rose-600 font-medium">
                      Sisa: {currentStock} {item.unit} (Min: {item.minStock || 5})
                    </div>
                  </div>
                  <Link
                    href="/admin/expenses"
                    className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    + Restok
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. VISUALISASI GRAFIK & KATEGORI PENGELUARAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual perbandingan Pemasukan vs Pengeluaran */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Arus Kas (Cash Flow)
          </h3>
          <div className="space-y-4">
            {/* Visual Bar Pemasukan */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">Pemasukan</span>
                <span className="text-slate-700">Rp {totalIncome.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      Math.max(totalIncome, totalExpense) > 0
                        ? (totalIncome / Math.max(totalIncome, totalExpense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Visual Bar Pengeluaran */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Pengeluaran</span>
                <span className="text-slate-700">Rp {totalExpense.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      Math.max(totalIncome, totalExpense) > 0
                        ? (totalExpense / Math.max(totalIncome, totalExpense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Break Down Kategori Pengeluaran */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Kategori Pengeluaran
          </h3>
          {totalExpense === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Belum ada pengeluaran pada periode ini.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(expenseCategories).map(([catName, val]) => {
                const percentage = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                return (
                  <div key={catName}>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>{catName}</span>
                      <span>{percentage}% (Rp {val.toLocaleString("id-ID")})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-sky-600 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. TABEL AKTIVITAS TERBARU (PESANAN & PENGELUARAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaksi / Pesanan Terbaru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-sky-600" />
              Pesanan Masuk Terbaru
            </h3>
            <Link href="/admin/orders" className="text-xs font-semibold text-sky-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {ordersLoading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Memuat transaksi...</p>
          ) : orders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada pesanan.</p>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map((ord) => (
                <div
                  key={ord.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      #{ord.orderNumber || ord.id.slice(0, 6)} - {ord.customerName || "Pelanggan"}
                    </div>
                    <div className="text-slate-500">{ord.serviceName || "Layanan"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">
                      + Rp {(ord.totalAmount || 0).toLocaleString("id-ID")}
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-sky-100 text-sky-800 font-semibold rounded text-[10px]">
                      {ord.status || "Baru"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catatan Pengeluaran Terbaru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-600" />
              Catatan Pengeluaran Terakhir
            </h3>
            <Link href="/admin/expenses" className="text-xs font-semibold text-sky-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {expensesLoading ? (
            <p className="text-xs text-slate-400 py-4 text-center">Memuat pengeluaran...</p>
          ) : expenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada pengeluaran.</p>
          ) : (
            <div className="space-y-2.5">
              {expenses.slice(0, 5).map((exp) => (
                <div
                  key={exp.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100"
                >
                  <div>
                    <div className="font-bold text-slate-800">{exp.title}</div>
                    <div className="text-slate-500">
                      <span className="font-semibold text-slate-600">{exp.category}</span>
                      {exp.itemName && ` • +${exp.addedQty} ${exp.itemName}`}
                    </div>
                  </div>
                  <div className="font-bold text-rose-600 text-right">
                    - Rp {(exp.amount || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}