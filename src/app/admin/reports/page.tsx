"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { ReportTableLayout, TableColumn, MetricItem } from "@/components/ReportTableLayout";
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Download, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

export default function FinancialReportPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const ordersQuery = useMemo(() => query(collection(db, "orders"), orderBy("createdAt", "desc")), []);
  const expensesQuery = useMemo(() => query(collection(db, "expenses"), orderBy("createdAt", "desc")), []);

  const { data: orders = [], loading: loadingOrders } = useFirestoreQuery<any>(ordersQuery);
  const { data: expenses = [], loading: loadingExpenses } = useFirestoreQuery<any>(expensesQuery);

  // Helper konversi tanggal Firestore Timestamp / String / Date
  const parseDate = (itemDate: any): Date | null => {
    if (!itemDate) return null;
    if (itemDate.seconds) return new Date(itemDate.seconds * 1000);
    if (itemDate instanceof Date) return itemDate;
    return new Date(itemDate);
  };

  // Helper penyaring rentang waktu
  const isWithinRange = (itemDate: any) => {
    const d = parseDate(itemDate);
    if (!d) return true;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }

    return true;
  };

  // Data Terfilter berdasarkan Rentang Waktu
  const filteredOrders = useMemo(() => orders.filter((o) => isWithinRange(o.createdAt)), [orders, startDate, endDate]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => isWithinRange(e.createdAt)), [expenses, startDate, endDate]);
  const completedOrders = useMemo(() => filteredOrders.filter((o) => o.status === "Selesai"), [filteredOrders]);

  // Perhitungan Metrik Ringkasan
  const totalIncome = useMemo(() => completedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), [completedOrders]);
  const totalExpense = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);
  const netProfit = totalIncome - totalExpense;

  // 1. Definisikan Metrik Ringkasan
  const metrics: MetricItem[] = [
    {
      label: "Total Pemasukan",
      details: `${completedOrders.length} Pesanan Selesai`,
      amount: totalIncome,
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      colorClass: "text-emerald-600",
    },
    {
      label: "Total Pengeluaran",
      details: `${filteredExpenses.length} Transaksi Pengeluaran`,
      amount: totalExpense,
      icon: <TrendingDown className="h-4 w-4 text-rose-600" />,
      colorClass: "text-rose-600",
    },
    {
      label: "Laba Bersih",
      details: "Sisa Keuntungan Operasional",
      amount: netProfit,
      icon: <Wallet className="h-4 w-4 text-sky-600" />,
      colorClass: netProfit >= 0 ? "text-sky-600" : "text-amber-600",
    },
  ];

  // 2. Gabungkan transaksi untuk tabel tampilan
  const transactions = useMemo(() => {
    const inc = completedOrders.map((o) => ({ ...o, type: "pemasukan" }));
    const exp = filteredExpenses.map((e) => ({ ...e, type: "pengeluaran" }));
    return [...inc, ...exp].sort((a, b) => {
      const dateA = parseDate(a.createdAt)?.getTime() || 0;
      const dateB = parseDate(b.createdAt)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [completedOrders, filteredExpenses]);

  // 3. Konfigurasi Kolom Tabel
  const columns: TableColumn<any>[] = [
    {
      header: "JENIS",
      accessor: (item) =>
        item.type === "pemasukan" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
            <ArrowUpCircle className="h-3.5 w-3.5" /> Pemasukan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
            <ArrowDownCircle className="h-3.5 w-3.5" /> Pengeluaran
          </span>
        ),
    },
    {
      header: "KETERANGAN",
      accessor: (item) =>
        item.type === "pemasukan"
          ? `Pesanan #${item.orderNumber || item.id?.slice(0, 6)} - ${item.customerName || "Pelanggan"}`
          : item.title || "Pengeluaran",
    },
    {
      header: "KATEGORI",
      accessor: (item) => item.serviceName || item.category || "Operasional",
    },
    {
      header: "NOMINAL",
      align: "right",
      accessor: (item) => (
        <span className={`font-bold ${item.type === "pemasukan" ? "text-emerald-600" : "text-rose-600"}`}>
          {item.type === "pemasukan" ? "+" : "-"} Rp {(item.totalAmount || item.amount || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
  ];

  // 4. Handler Export Laporan Excel (Multi-Sheet: Orderan Masuk, Pemasukan, Pengeluaran)
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Orderan Masuk
    const dataOrderanMasuk = filteredOrders.map((o) => ({
      "ID Order": o.orderNumber || o.id?.slice(0, 8),
      "Tanggal": parseDate(o.createdAt)?.toLocaleString("id-ID") || "-",
      "Pelanggan": o.customerName || "-",
      "Layanan": o.serviceName || "-",
      "Status": o.status || "Proses",
      "Total (Rp)": o.totalAmount || 0,
    }));
    const sheetOrderan = XLSX.utils.json_to_sheet(dataOrderanMasuk);
    XLSX.utils.book_append_sheet(workbook, sheetOrderan, "Orderan Masuk");

    // Sheet 2: Pemasukan (Order Selesai)
    const dataPemasukan = completedOrders.map((o) => ({
      "ID Order": o.orderNumber || o.id?.slice(0, 8),
      "Tanggal Selesai": parseDate(o.createdAt)?.toLocaleString("id-ID") || "-",
      "Pelanggan": o.customerName || "-",
      "Kategori/Layanan": o.serviceName || "Laundry",
      "Nominal (Rp)": o.totalAmount || 0,
    }));
    const sheetPemasukan = XLSX.utils.json_to_sheet(dataPemasukan);
    XLSX.utils.book_append_sheet(workbook, sheetPemasukan, "Pemasukan");

    // Sheet 3: Pengeluaran
    const dataPengeluaran = filteredExpenses.map((e) => ({
      "ID Transaksi": e.id?.slice(0, 8),
      "Tanggal": parseDate(e.createdAt)?.toLocaleString("id-ID") || "-",
      "Keterangan": e.title || "-",
      "Kategori": e.category || "Operasional",
      "Nominal (Rp)": e.amount || 0,
    }));
    const sheetPengeluaran = XLSX.utils.json_to_sheet(dataPengeluaran);
    XLSX.utils.book_append_sheet(workbook, sheetPengeluaran, "Pengeluaran");

    // Download File Excel
    const fileSuffix = startDate || endDate ? `${startDate || "Awal"}_sd_${endDate || "Akhir"}` : "Semua_Periode";
    XLSX.writeFile(workbook, `Laporan_Keuangan_${fileSuffix}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Panel Control Filter Tanggal & Export */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4 text-sky-600" />
            <span>Rentang Tanggal:</span>
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-sky-500"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-sky-500"
          />

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-rose-500 hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors ml-auto"
        >
          <Download className="h-4 w-4" />
          Export Excel (.xlsx)
        </button>
      </div>

      {/* Layout Tabel Laporan Utama */}
      <ReportTableLayout
        title="Laporan Keuangan"
        description="Ringkasan pemasukan dari pesanan selesai dan pengeluaran operasional."
        metrics={metrics}
        data={transactions}
        columns={columns}
        getDate={(item) => item.createdAt}
        isLoading={loadingOrders || loadingExpenses}
      />
    </div>
  );
}