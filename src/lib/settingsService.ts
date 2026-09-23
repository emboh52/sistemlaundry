import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  paperSize: "58mm" | "80mm";
  tenantId?: string;
}

/**
 * Perintah Ambil Data Pengaturan dari Firebase berdasarkan tenantId
 */
export const getBusinessSettings = async (tenantId: string): Promise<BusinessSettings | null> => {
  try {
    const settingsDocRef = doc(db, "settings", tenantId);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as BusinessSettings;
    }
    return null;
  } catch (error) {
    console.error("Gagal mengambil data pengaturan dari Firebase:", error);
    throw error;
  }
};

/**
 * Perintah Simpan Pengaturan ke Firebase berdasarkan tenantId
 */
export const saveBusinessSettings = async (data: BusinessSettings, tenantId: string): Promise<void> => {
  try {
    const settingsDocRef = doc(db, "settings", tenantId);
    await setDoc(settingsDocRef, { ...data, tenantId }, { merge: true });
  } catch (error) {
    console.error("Gagal menyimpan data pengaturan ke Firebase:", error);
    throw error;
  }
};