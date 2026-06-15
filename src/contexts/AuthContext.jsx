import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const login = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);
  const register = useCallback((email, password) => createUserWithEmailAndPassword(auth, email, password), []);
  const signInWithGoogle = useCallback(() => signInWithPopup(auth, new GoogleAuthProvider()), []);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({ user, loading, login, register, signInWithGoogle, logout }),
    [user, loading, login, register, signInWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
