"use client";

import { useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { ReportTableLayout, TableColumn, MetricItem } from "@/components/ReportTableLayout";
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function FinancialReportPage() {
  const ordersQuery = useMemo(() => query(collection(db, "orders"), orderBy("createdAt", "desc")), []);
  const expensesQuery = useMemo(() => query(collection(db, "expenses"), orderBy("createdAt", "desc")), []);

  const { data: orders = [], loading: loadingOrders } = useFirestoreQuery<any>(ordersQuery);
  const { data: expenses = [], loading: loadingExpenses } = useFirestoreQuery<any>(expensesQuery);

  const completedOrders = useMemo(() => orders.filter((o) => o.status === "Selesai"), [orders]);
  const totalIncome = useMemo(() => completedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), [completedOrders]);
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
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
      details: `${expenses.length} Transaksi Pengeluaran`,
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

  // 2. Gabungkan transaksi
  const transactions = useMemo(() => {
    const inc = completedOrders.map((o) => ({ ...o, type: "pemasukan" }));
    const exp = expenses.map((e) => ({ ...e, type: "pengeluaran" }));
    return [...inc, ...exp].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [completedOrders, expenses]);

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
          ? `Pesanan #${item.orderNumber || item.id.slice(0, 6)} - ${item.customerName || "Pelanggan"}`
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

  return (
    <ReportTableLayout
      title="Laporan Keuangan"
      description="Ringkasan pemasukan dari pesanan selesai dan pengeluaran operasional."
      metrics={metrics}
      data={transactions}
      columns={columns}
      getDate={(item) => item.createdAt}
      isLoading={loadingOrders || loadingExpenses}
    />
  );
}