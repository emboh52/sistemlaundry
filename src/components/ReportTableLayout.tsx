"use client";

import { useState, useMemo, ReactNode } from "react";
import { Calendar } from "lucide-react";

export type TimeFilter = "today" | "7days" | "1month" | "all";

export interface MetricItem {
  label: string;
  details: string;
  amount: number;
  icon?: ReactNode;
  colorClass?: string;
}

export interface TableColumn<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface ReportTableLayoutProps<T> {
  title: string;
  description: string;
  metrics?: MetricItem[];
  data: T[];
  columns: TableColumn<T>[];
  getDate?: (item: T) => any;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ReportTableLayout<T>({
  title,
  description,
  metrics = [],
  data,
  columns,
  getDate,
  isLoading = false,
  emptyMessage = "Belum ada transaksi recorded pada periode ini.",
}: ReportTableLayoutProps<T>) {
  const [filterRange, setFilterRange] = useState<TimeFilter>("all");

  // Logika Filter Rentang Waktu Otomatis
  const filteredData = useMemo(() => {
    if (!getDate || filterRange === "all") return data;

    return data.filter((item) => {
      const rawDate = getDate(item);
      if (!rawDate) return false;

      const itemDate = rawDate?.seconds
        ? new Date(rawDate.seconds * 1000)
        : new Date(rawDate);

      if (isNaN(itemDate.getTime())) return false;

      const now = new Date();
      if (filterRange === "today") {
        return (
          itemDate.getDate() === now.getDate() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      }
      if (filterRange === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return itemDate >= sevenDaysAgo;
      }
      if (filterRange === "1month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return itemDate >= oneMonthAgo;
      }
      return true;
    });
  }, [data, filterRange, getDate]);

  return (
    <div className="p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Filter Rentang Waktu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">{description}</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <Calendar className="h-4 w-4 text-slate-400 ml-2 mr-1 hidden sm:block" />
            {[
              { id: "today", label: "Hari Ini" },
              { id: "7days", label: "7 Hari" },
              { id: "1month", label: "1 Bulan" },
              { id: "all", label: "Semua" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterRange(btn.id as TimeFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterRange === btn.id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Ringkasan (Jikalau Ada Metrik Keuangan) */}
        {metrics.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-base">Ringkasan Ikhtisar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">METRIK</th>
                    <th className="p-4">RINCIAN</th>
                    <th className="p-4 text-right">TOTAL NOMINAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {metrics.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {m.icon}
                          <span>{m.label}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">{m.details}</td>
                      <td className={`p-4 text-right font-bold ${m.colorClass || "text-slate-800"}`}>
                        Rp {m.amount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabel Utama / Arus Kas / Mutasi */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-base">Detail Rincian Transaksi</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Memuat data...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center text-slate-500">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className={`p-4 ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredData.map((item, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                      {columns.map((col, colIndex) => (
                        <td
                          key={colIndex}
                          className={`p-4 ${
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                              ? "text-center"
                              : ""
                          }`}
                        >
                          {col.accessor(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}