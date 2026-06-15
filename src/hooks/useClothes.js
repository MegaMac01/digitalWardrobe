import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "./useAuth";
import { TYPE_ORDER } from "../utils/outfitEngine";
import { logClientError } from "../utils/telemetry";
import { sortNewest } from "../utils/helpers";

const MAX_RETRIES = 3;

function sanitizeFileName(name) {
  return name.replace(/\s+/g, "-").replace(/[^\w.-]/g, "").toLowerCase();
}

function clothesCol(uid) {
  return collection(db, "users", uid, "clothes");
}

function clothesDoc(uid, itemId) {
  return doc(db, "users", uid, "clothes", itemId);
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
    let retryTimer;
    let retries = 0;
    let unsubscribeFn = () => {};

    function subscribe() {
      unsubscribeFn = onSnapshot(
        clothesCol(user.uid),
        (snapshot) => {
          retries = 0;
          const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          setClothes(sortNewest(next));
          setError("");
          setLoading(false);
        },
        () => {
          logClientError("Wardrobe snapshot listener failed", {
            scope: "clothes",
            action: "snapshot-error",
            metadata: { userId: user.uid },
          });
          setLoading(false);
          if (retries < MAX_RETRIES) {
            retries += 1;
            retryTimer = setTimeout(() => {
              unsubscribeFn();
              subscribe();
            }, 3000 * retries);
          } else {
            setError("Could not load wardrobe right now.");
          }
        }
      );
    }

    subscribe();

    return () => {
      clearTimeout(retryTimer);
      unsubscribeFn();
    };
  }, [user]);

  const addClothing = useCallback(
    async ({ file, ...payload }) => {
      if (!user) throw new Error("Not authenticated");
      if (!file) throw new Error("Missing file");

      const storagePath = `clothes/${user.uid}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);

      try {
        await addDoc(clothesCol(user.uid), {
          ...payload,
          imageUrl,
          storagePath,
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
        });
      } catch (err) {
        // Clean up the uploaded file so it doesn't become orphaned
        await deleteObject(fileRef).catch(() => {});
        throw err;
      }
    },
    [user]
  );

  const updateClothing = useCallback(
    async (itemId, payload) => {
      await updateDoc(clothesDoc(user.uid, itemId), payload);
    },
    [user]
  );

  const deleteClothing = useCallback(
    async (item) => {
      await deleteDoc(clothesDoc(user.uid, item.id));
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath)).catch((err) =>
          logClientError(err, {
            scope: "clothes",
            action: "delete-storage-object",
            metadata: { itemId: item.id },
          })
        );
      }
    },
    [user]
  );

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
