import { createContext, ReactNode, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface LoginParams {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      // TODO: api request for "current" user should succeed if we have a valid cookie
    };

    checkUser()
      .then(() =>
        console.info("[AuthProvider] checkUser completed successfully")
      )
      .catch((err) => console.error(`[AuthProvider] checkUser failed: ${err}`));
  }, []);

  const login = async ({ email, password }: LoginParams) => {
    console.log(`Login request for ${email}:${password}`);
  };

  const logout = async () => {
    console.log("Logout request");
  };

  return (
    <AuthContext.Provider value={{ user: null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
