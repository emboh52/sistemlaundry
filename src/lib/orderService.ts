// src/lib/orderService.ts (atau buat di file helper transaksi Anda)
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  increment 
} from "firebase/firestore";

interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  serviceName: string;
  totalAmount: number;
  status?: string;
}

export async function createOrderWithAutoCustomer(payload: CreateOrderPayload) {
  try {
    const customersRef = collection(db, "customers");
    // 1. Cek apakah nomor HP sudah terdaftar
    const q = query(customersRef, where("phone", "==", payload.customerPhone.trim()));
    const querySnapshot = await getDocs(q);

    let customerId = "";

    if (!querySnapshot.empty) {
      // PELANGGAN SUDAH ADA -> Update riwayat & total pesanan saja
      const existingDoc = querySnapshot.docs[0];
      customerId = existingDoc.id;

      await updateDoc(doc(db, "customers", customerId), {
        totalOrders: increment(1),
        lastOrderAt: serverTimestamp(),
        // Perbarui alamat jika ada input baru
        ...(payload.customerAddress && { address: payload.customerAddress }),
      });
    } else {
      // PELANGGAN BELUM ADA -> Otomatis daftarkan sebagai pelanggan baru!
      const newCustomerRef = await addDoc(customersRef, {
        name: payload.customerName,
        phone: payload.customerPhone.trim(),
        address: payload.customerAddress || "-",
        totalOrders: 1,
        createdAt: serverTimestamp(),
        lastOrderAt: serverTimestamp(),
      });
      customerId = newCustomerRef.id;
    }

    // 2. Simpan Pesanan ke Collection 'orders'
    const newOrderRef = await addDoc(collection(db, "orders"), {
      customerId: customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      serviceName: payload.serviceName,
      totalAmount: payload.totalAmount,
      status: payload.status || "Baru",
      createdAt: serverTimestamp(),
    });

    return { success: true, orderId: newOrderRef.id, customerId };
  } catch (error) {
    console.error("Gagal memproses pesanan & pelanggan:", error);
    throw error;
  }
}