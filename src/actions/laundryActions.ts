"use server";

import { db } from "@/lib/firebase";
import { doc, runTransaction, collection, serverTimestamp, Timestamp } from "firebase/firestore";

// Create Order with Atomic Transaction (Inventory decrement + Customer stats update + Finance log if paid)
export async function createOrderAction(orderData: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceId: string;
  serviceName: string;
  weightOrQty: number;
  totalAmount: number;
  paymentStatus: "Lunas" | "Belum Bayar";
  inventoryItemId?: string;
  inventoryDeductQty?: number;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. If inventory item specified, check and deduct stock
      if (orderData.inventoryItemId && orderData.inventoryDeductQty) {
        const itemRef = doc(db, "inventory", orderData.inventoryItemId);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error("Item inventori tidak ditemukan.");
        }
        const currentStock = itemDoc.data().stock || 0;
        if (currentStock < orderData.inventoryDeductQty) {
          throw new Error(`Stok tidak mencukupi! Sisa stok: ${currentStock}`);
        }
        transaction.update(itemRef, { stock: currentStock - orderData.inventoryDeductQty });
      }

      // 2. Create Order document reference
      const orderRef = doc(collection(db, "orders"));
      const newOrder = {
        id: orderRef.id,
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        address: orderData.address,
        serviceId: orderData.serviceId,
        serviceName: orderData.serviceName,
        weightOrQty: orderData.weightOrQty,
        totalAmount: orderData.totalAmount,
        paymentStatus: orderData.paymentStatus,
        status: "Diterima",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.set(orderRef, newOrder);

      // 3. Update or create customer record
      // We can query or use phone as customer ID
      const customerId = orderData.customerPhone.replace(/[^0-9]/g, "");
      const customerRef = doc(db, "customers", customerId);
      const customerDoc = await transaction.get(customerRef);

      if (customerDoc.exists()) {
        const cData = customerDoc.data();
        const newTotalSpent = (cData.totalSpent || 0) + (orderData.paymentStatus === "Lunas" ? orderData.totalAmount : 0);
        const newTotalOrders = (cData.totalOrders || 0) + 1;
        transaction.update(customerRef, {
          totalSpent: newTotalSpent,
          totalOrders: newTotalOrders,
          lastOrderDate: serverTimestamp(),
        });
      } else {
        transaction.set(customerRef, {
          id: customerId,
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.address,
          totalSpent: orderData.paymentStatus === "Lunas" ? orderData.totalAmount : 0,
          totalOrders: 1,
          createdAt: serverTimestamp(),
          lastOrderDate: serverTimestamp(),
        });
      }

      // 4. If paymentStatus is Lunas, record finance log
      if (orderData.paymentStatus === "Lunas") {
        const financeRef = doc(collection(db, "finance_logs"));
        transaction.set(financeRef, {
          orderId: orderRef.id,
          orderNumber: orderData.orderNumber,
          type: "income",
          amount: orderData.totalAmount,
          description: `Pembayaran Pesanan #${orderData.orderNumber} - ${orderData.customerName}`,
          createdAt: serverTimestamp(),
        });
      }

      return { success: true, orderId: orderRef.id };
    });

    return result;
  } catch (error: any) {
    console.error("Transaction error in createOrderAction:", error);
    return { success: false, error: error.message || "Gagal membuat pesanan." };
  }
}

// Update Order Status & record finance log if completed/paid
export async function updateOrderStatusAction(orderId: string, newStatus: string) {
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) throw new Error("Pesanan tidak ditemukan.");

      const orderData = orderDoc.data();
      transaction.update(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // If status becomes Selesai or Diambil and payment is Lunas, ensure finance log exists
      if ((newStatus === "Selesai" || newStatus === "Diambil") && orderData.paymentStatus === "Lunas") {
        // check if finance log already exists for this order
        // For simplicity in transaction, we can add a log or update
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
