import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  paperSize: "58mm" | "80mm";
}

const SETTINGS_DOC_REF = doc(db, "settings", "business");

/**
 * Perintah Ambil Data Pengaturan dari Firebase
 */
export const getBusinessSettings = async (): Promise<BusinessSettings | null> => {
  try {
    const docSnap = await getDoc(SETTINGS_DOC_REF);
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
 * Perintah Simpan Pengaturan ke Firebase
 */
export const saveBusinessSettings = async (data: BusinessSettings): Promise<void> => {
  try {
    await setDoc(SETTINGS_DOC_REF, data, { merge: true });
  } catch (error) {
    console.error("Gagal menyimpan data pengaturan ke Firebase:", error);
    throw error;
  }
};