import { createContext } from "react";

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
});
