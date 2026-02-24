import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "./useAuth";
import { TYPE_ORDER } from "../utils/outfitEngine";

function sanitizeFileName(name) {
  return name.replace(/\s+/g, "-").replace(/[^\w.-]/g, "").toLowerCase();
}

function sortNewest(items) {
  return [...items].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export function useClothes() {
  const { user } = useAuth();
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setClothes([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const clothesQuery = query(collection(db, "clothes"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(
      clothesQuery,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setClothes(sortNewest(next));
        setError("");
        setLoading(false);
      },
      () => {
        setError("Could not load wardrobe right now.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addClothing = useCallback(
    async ({ file, ...payload }) => {
      if (!user) {
        throw new Error("Not authenticated");
      }
      if (!file) {
        throw new Error("Missing file");
      }

      const storagePath = `clothes/${user.uid}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);

      await addDoc(collection(db, "clothes"), {
        ...payload,
        uid: user.uid,
        imageUrl,
        storagePath,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
    },
    [user]
  );

  const updateClothing = useCallback(async (itemId, payload) => {
    await updateDoc(doc(db, "clothes", itemId), payload);
  }, []);

  const deleteClothing = useCallback(async (item) => {
    await deleteDoc(doc(db, "clothes", item.id));
    if (item.storagePath) {
      await deleteObject(ref(storage, item.storagePath)).catch(() => {});
    }
  }, []);

  const groupedByType = useMemo(
    () =>
      TYPE_ORDER.reduce((acc, type) => {
        acc[type] = clothes.filter((item) => item.type === type);
        return acc;
      }, {}),
    [clothes]
  );

  return {
    clothes,
    groupedByType,
    loading,
    error,
    addClothing,
    updateClothing,
    deleteClothing,
  };
}
