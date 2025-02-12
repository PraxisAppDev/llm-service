import { createAdminSession, deleteAdminSession, getCurrentAdmin } from "@/api";
import { LoaderCircle } from "lucide-react";
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

  const login = useCallback(
    async (credentials: LoginParams) => {
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
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    if (!user) return { ok: false, error: "Not currently logged in!" };

    try {
      const { error } = await deleteAdminSession(user.id);

      if (error) {
        console.info(`[AuthProvider] Logout failed: ${error.messages[0]}`);
        return { ok: false, error: error.messages[0] };
      } else {
        console.info(
          `[AuthProvider] Logout successful! ${user.email} -> ${user.id}`
        );
        setUser(null);
        return { ok: true, error: undefined };
      }
    } catch (e) {
      console.error("[AuthProvider] Error logging out", e);
      return { ok: false, error: "Unexpected logout error occured" };
    }
  }, [user, setUser]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {user === undefined ? <Loading /> : children}
    </AuthContext.Provider>
  );
}

function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="text-6xl text-center tracking-widest">
          Praxis Afterhours
        </h1>
        <h2 className="text-4xl text-center tracking-widest italic">
          LLM Service
        </h2>
        <LoaderCircle className="animate-spin" size={48} />
      </div>
    </div>
  );
}
