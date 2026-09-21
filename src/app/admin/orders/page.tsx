"use client";

import { useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Plus, LayoutGrid, List, X, CheckCircle2, UserPlus, Printer } from "lucide-react";

interface Order {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  serviceName?: string;
  weightQty?: number;
  totalAmount?: number;
  paymentStatus?: string;
  status?: string;
  notes?: string;
}

interface CustomerItem {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
}

interface ServiceItem {
  id: string;
  name?: string;
  price?: number;
  unit?: string;
}

// Interface untuk Data Pengaturan Toko
interface SettingsItem {
  id?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
}

export default function OrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServicePrice, setSelectedServicePrice] = useState<number>(0);
  
  // State untuk menyimpan order yang sedang/baru saja dicetak
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // State Koneksi Printer & Device Handle
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [printerPort, setPrinterPort] = useState<any>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    serviceName: "",
    weightQty: 1,
    totalAmount: 0,
    paymentStatus: "Belum Bayar",
    notes: "",
  });

  // Query Data Pesanan
  const ordersQuery = useMemo(
    () => query(collection(db, "orders"), orderBy("createdAt", "desc")),
    []
  );
  const { data: orders = [], loading } = useFirestoreQuery<Order>(ordersQuery);

  // Query Data Pelanggan untuk Auto-detect & Auto-fill
  const customersQuery = useMemo(() => query(collection(db, "customers")), []);
  const { data: customers = [] } = useFirestoreQuery<CustomerItem>(customersQuery);

  // Query Data Layanan untuk Dropdown
  const servicesQuery = useMemo(() => query(collection(db, "services")), []);
  const { data: services = [] } = useFirestoreQuery<ServiceItem>(servicesQuery);

  // Query Data Pengaturan Toko dari Firestore
  const settingsQuery = useMemo(() => query(collection(db, "settings")), []);
  const { data: settingsList = [] } = useFirestoreQuery<SettingsItem>(settingsQuery);
  const settings = settingsList[0] || {}; // Mengambil dokumen pertama dari koleksi settings

  // Cek apakah nama yang diketik sudah terdaftar
  const matchedCustomer = useMemo(() => {
    if (!form.customerName.trim()) return null;
    return customers.find(
      (c) => c.name?.toLowerCase() === form.customerName.trim().toLowerCase()
    );
  }, [form.customerName, customers]);

  const isRegisteredCustomer = Boolean(matchedCustomer);

  // Fungsi Hubungkan/Putuskan Printer Thermal (Web Serial / Bluetooth)
  const handleConnectPrinter = async () => {
    if (isPrinterConnected) {
      if (printerPort && printerPort.close) {
        try { await printerPort.close(); } catch (e) {}
      }
      setPrinterPort(null);
      setIsPrinterConnected(false);
      return;
    }

    try {
      if ("serial" in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        setPrinterPort(port);
        setIsPrinterConnected(true);
      } else if ("bluetooth" in navigator) {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["00001101-0000-1000-8000-00805f9b34fb"],
        });
        const server = await device.gatt.connect();
        setPrinterPort(server);
        setIsPrinterConnected(true);
      } else {
        alert("Browser tidak mendukung koneksi printer langsung (Web Serial/Bluetooth). Gunakan Chrome/Edge.");
      }
    } catch (err) {
      console.error("Gagal terhubung ke printer:", err);
    }
  };

  // Fungsi Cetak Otomatis Langsung ke Printer Tanpa Modal Preview Browser
  const printDirectToPrinter = async (orderData: Order, storeSettings: SettingsItem) => {
    if (!printerPort) return;

    try {
      const encoder = new TextEncoder();
      const receiptText =
        `\x1b\x40` + // Reset/Init Printer
        `\x1b\x61\x01` + // Align Center
        `${storeSettings.storeName || "NOTA LAUNDRY"}\n` +
        `${storeSettings.storeAddress ? storeSettings.storeAddress + "\n" : ""}` +
        `${storeSettings.storePhone ? "Telp/WA: " + storeSettings.storePhone + "\n" : ""}` +
        `--------------------------------\n` +
        `\x1b\x61\x00` + // Align Left
        `No. Order: #${orderData.orderNumber}\n` +
        `Pelanggan: ${orderData.customerName}\n` +
        (orderData.customerPhone ? `No. HP   : ${orderData.customerPhone}\n` : "") +
        `--------------------------------\n` +
        `${orderData.serviceName} (${orderData.weightQty} Kg)\n` +
        `Total     : Rp ${(orderData.totalAmount || 0).toLocaleString("id-ID")}\n` +
        `--------------------------------\n` +
        `Status Bayar: ${orderData.paymentStatus}\n` +
        (orderData.notes ? `Catatan: ${orderData.notes}\n` : "") +
        `--------------------------------\n` +
        `\x1b\x61\x01` + // Align Center
        `${storeSettings.receiptFooter || "Terima kasih atas kunjungan Anda!"}\n\n\n\n` +
        `\x1d\x56\x41\x03`; // Cut Paper Command

      const data = encoder.encode(receiptText);

      if (printerPort.writable) {
        const writer = printerPort.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
      }
    } catch (error) {
      console.error("Gagal mencetak otomatis:", error);
    }
  };

  // Handler saat Nama Pelanggan diketik / dipilih
  const handleCustomerNameChange = (name: string) => {
    const matched = customers.find(
      (c) => c.name?.toLowerCase() === name.trim().toLowerCase()
    );

    if (matched) {
      setForm((prev) => ({
        ...prev,
        customerName: name,
        customerPhone: matched.phone || "",
        customerAddress: matched.address || "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        customerName: name,
      }));
    }
  };

  // Ubah status pesanan di Firestore
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (error) {
      alert("Gagal memperbarui status!");
    }
  };

  // Handler saat layanan dipilih (Otomatis hitung total)
  const handleServiceChange = (serviceName: string) => {
    const selected = services.find((s) => s.name === serviceName);
    const price = selected?.price || 0;
    setSelectedServicePrice(price);

    setForm((prev) => ({
      ...prev,
      serviceName,
      totalAmount: price * prev.weightQty,
    }));
  };

  // Handler saat berat/qty diubah (Otomatis hitung total)
  const handleWeightChange = (weightQty: number) => {
    setForm((prev) => ({
      ...prev,
      weightQty,
      totalAmount: selectedServicePrice * weightQty,
    }));
  };

  // Simpan Pesanan Baru & Otomatis Tambah Pelanggan jika Baru + Trigger Cetak Struk
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceName) {
      alert("Silakan pilih Layanan terlebih dahulu!");
      return;
    }

    try {
      const finalCustomerName = form.customerName.trim() || "Pelanggan Umum";

      // 1. Jika nama diisi & BELUM terdaftar, simpan otomatis sebagai Pelanggan Baru
      if (finalCustomerName !== "Pelanggan Umum" && !isRegisteredCustomer) {
        await addDoc(collection(db, "customers"), {
          name: finalCustomerName,
          phone: form.customerPhone.trim(),
          address: form.customerAddress.trim(),
          createdAt: serverTimestamp(),
        });
      }

      // Buat objek data order baru
      const newOrderData = {
        ...form,
        customerName: finalCustomerName,
        weightQty: Number(form.weightQty),
        totalAmount: Number(form.totalAmount),
        orderNumber: `CE-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "Baru",
        createdAt: serverTimestamp(),
      };

      // 2. Simpan Pesanan ke Firestore
      await addDoc(collection(db, "orders"), newOrderData);

      // 3. Set data order untuk cetak
      setPrintOrder(newOrderData);

      // 4. Otomatis Cetak Langsung HANYA saat Printer Sudah Terhubung (Tanpa preview print window.print)
      if (isPrinterConnected && printerPort) {
        await printDirectToPrinter(newOrderData, settings);
      }

      setIsModalOpen(false);
      setForm({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        serviceName: "",
        weightQty: 1,
        totalAmount: 0,
        paymentStatus: "Belum Bayar",
        notes: "",
      });
      setSelectedServicePrice(0);
    } catch (error) {
      alert("Gagal menambah pesanan!");
    }
  };

  return (
    <div className="p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Pesanan (POS)</h1>
            <p className="text-sm text-slate-500">Kelola status transaksi dan pembuatan pesanan pelanggan.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Indikator Status & Tombol Koneksi Printer */}
            <button
              onClick={handleConnectPrinter}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                isPrinterConnected
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Printer className={`h-4 w-4 ${isPrinterConnected ? "text-emerald-600" : "text-slate-400"}`} />
              <span>{isPrinterConnected ? "Printer Terhubung" : "Hubungkan Printer"}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isPrinterConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
            </button>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button className="p-1.5 text-sky-600 bg-slate-100 rounded-md">
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600">
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Pesanan Baru</span>
            </button>
          </div>
        </div>

        {/* Tabel Data Pesanan */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data pesanan...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Belum ada pesanan terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">NO. PESANAN</th>
                    <th className="p-4">PELANGGAN</th>
                    <th className="p-4">LAYANAN</th>
                    <th className="p-4">BERAT/QTY</th>
                    <th className="p-4">TOTAL</th>
                    <th className="p-4">STATUS BAYAR</th>
                    <th className="p-4">STATUS PESANAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-sky-900">#{ord.orderNumber || ord.id?.slice(0, 6)}</td>
                      <td className="p-4 text-slate-800 font-medium">
                        {ord.customerName || "Pelanggan Umum"}
                        {ord.customerPhone && (
                          <span className="block text-xs text-slate-400 font-normal">{ord.customerPhone}</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">{ord.serviceName || "-"}</td>
                      <td className="p-4 text-slate-600">{ord.weightQty ? `${ord.weightQty} Kg` : "-"}</td>
                      <td className="p-4 font-bold text-slate-900">Rp {(ord.totalAmount || 0).toLocaleString("id-ID")}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${
                            ord.paymentStatus === "Lunas" ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                      </td>
                      <td className="p-4">
                        <select
                          value={ord.status || "Proses"}
                          onChange={(e) => handleStatusChange(ord.id!, e.target.value)}
                          className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="Baru">Baru</option>
                          <option value="Proses">Proses</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Diambil">Diambil</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL POP-UP BUAT PESANAN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Buat Pesanan Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="space-y-4 text-sm">
              {/* INPUT NAMA PELANGGAN */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Nama Pelanggan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  {isRegisteredCustomer ? (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terdaftar
                    </span>
                  ) : form.customerName.trim() ? (
                    <span className="text-[11px] text-sky-600 font-semibold flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> Pelanggan Baru
                    </span>
                  ) : null}
                </div>

                <input
                  type="text"
                  list="customers-list"
                  value={form.customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Ketik nama atau biarkan kosong..."
                  className={`w-full border rounded-lg p-2.5 outline-none transition-all ${
                    isRegisteredCustomer 
                      ? "border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20" 
                      : "border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                  }`}
                />

                <datalist id="customers-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.phone ? `No. HP: ${c.phone}` : "Pelanggan Terdaftar"}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* INPUT NO HP & ALAMAT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="0812xxxxxxx"
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat</label>
                  <input
                    type="text"
                    value={form.customerAddress}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                    placeholder="Alamat singkat"
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* DROPDOWN LAYANAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Layanan</label>
                <select
                  required
                  value={form.serviceName}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">-- Pilih Layanan --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} - Rp {(s.price || 0).toLocaleString("id-ID")}/{s.unit || "Kg"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Berat / Qty (Kg)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.weightQty}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total (Rp)</label>
                  <input
                    type="number"
                    required
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sky-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Pembayaran</label>
                <select
                  value={form.paymentStatus}
                  onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>

              {/* INPUT CATATAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Contoh: Baju putih dipisah, jangan terlalu wangi..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700">
                  Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELEMEN STRUK UNTUK CETAK THERMAL (Sembunyi di Layar, Tampil Saat Cetak) */}
      {printOrder && (
        <div
          id="printable-receipt"
          className="hidden print:block p-2 text-black font-mono text-xs w-[58mm] mx-auto"
        >
          {/* Header Toko dari Firestore Pengaturan */}
          <div className="text-center font-bold text-sm mb-0.5 uppercase">
            {settings.storeName || "NOTA LAUNDRY"}
          </div>
          {settings.storeAddress && (
            <div className="text-center text-[10px] leading-tight">
              {settings.storeAddress}
            </div>
          )}
          {settings.storePhone && (
            <div className="text-center text-[10px] mb-1">
              Telp/WA: {settings.storePhone}
            </div>
          )}

          <div className="border-b border-dashed border-black my-1" />

          <div className="flex justify-between">
            <span>No. Order:</span>
            <span className="font-bold">#{printOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{printOrder.customerName}</span>
          </div>
          {printOrder.customerPhone && (
            <div className="flex justify-between">
              <span>No. HP:</span>
              <span>{printOrder.customerPhone}</span>
            </div>
          )}

          <div className="border-b border-dashed border-black my-1" />

          <div className="flex justify-between font-bold my-1">
            <span>{printOrder.serviceName} ({printOrder.weightQty} Kg)</span>
            <span>Rp {(printOrder.totalAmount || 0).toLocaleString("id-ID")}</span>
          </div>

          <div className="border-b border-dashed border-black my-1" />

          <div className="flex justify-between">
            <span>Status Bayar:</span>
            <span>{printOrder.paymentStatus}</span>
          </div>
          {printOrder.notes && (
            <div className="flex justify-between">
              <span>Catatan:</span>
              <span>{printOrder.notes}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL:</span>
            <span>Rp {(printOrder.totalAmount || 0).toLocaleString("id-ID")}</span>
          </div>

          <div className="border-b border-dashed border-black my-1" />

          {/* Footer Struk dari Firestore Pengaturan */}
          <div className="text-center mt-3 text-[10px]">
            {settings.receiptFooter || "Terima kasih atas kunjungan Anda!"}
          </div>
        </div>
      )}
    </div>
  );
}