import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { registerSessionExpiredHandler } from "../api/client";
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  saveSession,
  type StoredUser,
} from "./tokenStorage";

interface AuthContextValue {
  user: StoredUser | null;
  isLoggedIn: boolean;
  register: (params: authApi.RegisterRequest) => Promise<void>;
  login: (params: authApi.LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      setUser(null);
    });
  }, []);

  const applyAuthResponse = (response: authApi.AuthResponse) => {
    const storedUser: StoredUser = {
      userId: response.userId,
      username: response.username,
      displayName: response.displayName,
    };
    saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: storedUser,
    });
    setUser(storedUser);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: user !== null,
      register: async (params) => {
        const response = await authApi.register(params);
        applyAuthResponse(response);
      },
      login: async (params) => {
        const response = await authApi.login(params);
        applyAuthResponse(response);
      },
      logout: async () => {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            await authApi.logout({ refreshToken });
          } catch {
            // サーバー側の失効に失敗してもクライアント側のログアウトは継続する
          }
        }
        clearSession();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
