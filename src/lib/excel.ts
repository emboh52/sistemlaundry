export interface OrderExportData {
  createdAt: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  weightOrQty: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
}

// Fungsi diubah menjadi async agar bisa melakukan import XLSX secara dinamis
export const exportOrdersToExcel = async (
  orders: OrderExportData[],
  fileName = "Laporan_LALALAUNDRY.xlsx"
) => {
  if (!orders || orders.length === 0) {
    alert("Tidak ada data laporan untuk diunduh.");
    return;
  }

  // Import XLSX hanya saat fungsi ini dipanggil (Lazy Loading)
  const XLSX = await import("xlsx");

  const formattedData = orders.map((order) => ({
    "Tanggal": order.createdAt,
    "No. Pesanan": order.orderNumber,
    "Nama Pelanggan": order.customerName,
    "No. WhatsApp": order.customerPhone,
    "Layanan": order.serviceName,
    "Qty/Berat": order.weightOrQty,
    "Total Harga (IDR)": order.totalAmount,
    "Status Pembayaran": order.paymentStatus,
    "Status Pesanan": order.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");

  // Pengaturan lebar kolom otomatis (Auto-fit Column Width)
  const maxChars = Object.keys(formattedData[0]).map((key) => key.length);
  formattedData.forEach((row) => {
    Object.values(row).forEach((val, idx) => {
      const len = String(val ?? "").length;
      if (len > (maxChars[idx] || 10)) maxChars[idx] = len;
    });
  });
  worksheet["!cols"] = maxChars.map((w) => ({ width: w + 4 }));

  XLSX.writeFile(workbook, fileName);
};