import { useCallback, useEffect, useState } from "react";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";
import { useAuth } from "./useAuth";

// The user's full-body photo for photoreal try-on, kept at a fixed private path.
// Existence is checked by trying to read its download URL — no Firestore doc.
function modelRef(uid) {
  return ref(storage, `tryon/${uid}/model.jpg`);
}

export function useTryOnPhoto() {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPhotoUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPhotoUrl(await getDownloadURL(modelRef(user.uid)));
    } catch {
      setPhotoUrl(null); // not uploaded yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadPhoto = useCallback(
    async (file) => {
      if (!user) throw new Error("Not authenticated");
      await uploadBytes(modelRef(user.uid), file, { contentType: file.type || "image/jpeg" });
      await refresh();
    },
    [user, refresh]
  );

  const deletePhoto = useCallback(async () => {
    if (!user) return;
    await deleteObject(modelRef(user.uid)).catch(() => {});
    setPhotoUrl(null);
  }, [user]);

  return { photoUrl, loading, uploadPhoto, deletePhoto };
}
