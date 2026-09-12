import { useEffect, useState, useRef } from "react";
import { onSnapshot, Query, DocumentData } from "firebase/firestore";

export function useFirestoreQuery<T = DocumentData>(queryRef: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Mengunci referensi query agar useEffect tidak berulang terus-menerus
  const ref = useRef(queryRef);

  useEffect(() => {
    if (!queryRef) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const items: T[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];

        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Hook Error:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Unsubscribe saat komponen unmount
    return () => unsubscribe();
  }, []); // Dependency kosong murni agar koneksi snapshot stabil & tidak berkedip

  return { data, loading, error };
}