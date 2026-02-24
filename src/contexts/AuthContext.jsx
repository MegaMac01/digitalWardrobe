import React, { useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      register: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      signInWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: () => signOut(auth),
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
