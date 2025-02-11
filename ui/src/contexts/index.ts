import { createContext } from "react";
import { AuthState } from "./auth";

export const AuthContext = createContext<AuthState>({
  user: null,
  login: async () => {},
  logout: async () => {},
});
