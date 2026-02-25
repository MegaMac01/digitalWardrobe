import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import { logClientError } from "../utils/telemetry";

function sortNewest(items) {
  return [...items].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

export function useOutfits() {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setOutfits([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const outfitsQuery = query(collection(db, "outfits"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(
      outfitsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setOutfits(sortNewest(next));
        setError("");
        setLoading(false);
      },
      () => {
        logClientError("Outfit snapshot listener failed", {
          scope: "outfits",
          action: "snapshot-error",
          metadata: { userId: user.uid },
        });
        setError("Could not load outfits right now.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addOutfit = useCallback(
    async (payload) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      await addDoc(collection(db, "outfits"), {
        ...payload,
        uid: user.uid,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
    },
    [user]
  );

  const deleteOutfit = useCallback(async (outfitId) => {
    await deleteDoc(doc(db, "outfits", outfitId));
  }, []);

  const scheduleOutfit = useCallback(async (outfitId, dateISO) => {
    await updateDoc(doc(db, "outfits", outfitId), {
      scheduledDates: arrayUnion(dateISO),
    });
  }, []);

  const unscheduleOutfit = useCallback(async (outfitId, dateISO) => {
    await updateDoc(doc(db, "outfits", outfitId), {
      scheduledDates: arrayRemove(dateISO),
    });
  }, []);

  return {
    outfits,
    loading,
    error,
    addOutfit,
    deleteOutfit,
    scheduleOutfit,
    unscheduleOutfit,
  };
}
