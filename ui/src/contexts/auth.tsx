import { getCurrentAdmin } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null | undefined;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState>({
  user: undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentAdmin,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  let user: typeof data | null;
  if (isPending) {
    console.info("[AuthProvider] Fetching current admin user...");
    user = undefined;
  } else if (isError) {
    console.error(`[AuthProvider] Error fetching current admin user: ${error?.message}`);
    user = null;
  } else {
    console.info("[AuthProvider] Updating current admin user");
    user = data;
  }

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
