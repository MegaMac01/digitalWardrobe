import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import { logClientError } from "../utils/telemetry";
import { sortNewest } from "../utils/helpers";

const MAX_RETRIES = 3;

function outfitsCol(uid) {
  return collection(db, "users", uid, "outfits");
}

function outfitsDoc(uid, outfitId) {
  return doc(db, "users", uid, "outfits", outfitId);
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
    let retryTimer;
    let retries = 0;
    let unsubscribeFn = () => {};

    function subscribe() {
      unsubscribeFn = onSnapshot(
        outfitsCol(user.uid),
        (snapshot) => {
          retries = 0;
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
          setLoading(false);
          if (retries < MAX_RETRIES) {
            retries += 1;
            retryTimer = setTimeout(() => {
              unsubscribeFn();
              subscribe();
            }, 3000 * retries);
          } else {
            setError("Could not load outfits right now.");
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

  const addOutfit = useCallback(
    async (payload) => {
      if (!user) throw new Error("Not authenticated");
      await addDoc(outfitsCol(user.uid), {
        ...payload,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
    },
    [user]
  );

  const updateOutfit = useCallback(
    async (outfitId, payload) => {
      await updateDoc(outfitsDoc(user.uid, outfitId), payload);
    },
    [user]
  );

  const deleteOutfit = useCallback(
    async (outfitId) => {
      await deleteDoc(outfitsDoc(user.uid, outfitId));
    },
    [user]
  );

  const scheduleOutfit = useCallback(
    async (outfitId, dateISO) => {
      await updateDoc(outfitsDoc(user.uid, outfitId), {
        scheduledDates: arrayUnion(dateISO),
      });
    },
    [user]
  );

  const unscheduleOutfit = useCallback(
    async (outfitId, dateISO) => {
      await updateDoc(outfitsDoc(user.uid, outfitId), {
        scheduledDates: arrayRemove(dateISO),
      });
    },
    [user]
  );

  return {
    outfits,
    loading,
    error,
    addOutfit,
    updateOutfit,
    deleteOutfit,
    scheduleOutfit,
    unscheduleOutfit,
  };
}
