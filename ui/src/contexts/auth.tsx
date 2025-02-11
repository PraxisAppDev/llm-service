import { createAdminSession, getCurrentAdmin } from "@/api";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContext } from ".";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthResult {
  ok: boolean;
  error: string | undefined;
}

interface LoginParams {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null | undefined;
  login: (params: LoginParams) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const checkUser = async () => {
      // request for "current" user should succeed if we have a valid cookie
      try {
        const { user, error } = await getCurrentAdmin();

        if (user) {
          console.info(
            `[AuthProvider] Got current admin user ${user.email} -> ${user.id}`
          );
          setUser(user);
        } else {
          console.info(
            `[AuthProvider] Failed to get current admin user: ${error.error}`
          );
          setUser(null);
        }
      } catch (e) {
        console.error("[AuthProvider] Error fetching current admin user", e);
        setUser(null);
      }
    };

    checkUser()
      .then(() =>
        console.info("[AuthProvider] checkUser completed successfully")
      )
      .catch((err) => console.error(`[AuthProvider] checkUser failed: ${err}`));
  }, []);

  const login = useCallback(async (credentials: LoginParams) => {
    try {
      const { user, error } = await createAdminSession(credentials);

      if (user) {
        console.info(
          `[AuthProvider] Login successful! ${user.email} -> ${user.id}`
        );
        setUser(user);
        return { ok: true, error: undefined };
      } else {
        console.info(`[AuthProvider] Login failed: ${error.messages[0]}`);
        setUser(null);
        return { ok: false, error: error.messages[0] };
      }
    } catch (e) {
      console.error("[AuthProvider] Error logging in", e);
      setUser(null);
      return { ok: false, error: "Unexpected login error occured" };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("Logout request");
    return { ok: false, error: "Logout not implemented!" };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {user === undefined ? <Loading /> : children}
    </AuthContext.Provider>
  );
}

function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h1 className="text-xl text-center tracking-widest">Loading...</h1>
      </div>
    </div>
  );
}
