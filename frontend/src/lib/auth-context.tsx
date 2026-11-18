"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/* ── Types ───────────────────────────────────────────────────────── */

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: string;
  created_at: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

/* ── Context ─────────────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Provider ────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /* Fetch profile from token on mount */
  const refreshProfile = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("evolora_access_token")
          : null;

      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const profile = await api.getProfile();
      setState({ user: profile, isLoading: false, isAuthenticated: true });
    } catch {
      // Token expired or invalid — clear it
      api.clearTokens();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  /* Login */
  const login = useCallback(
    async (email: string, password: string) => {
      await api.login(email, password);
      await refreshProfile();
      router.push("/dashboard");
    },
    [refreshProfile, router],
  );

  /* Register */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api.register(name, email, password);
      await refreshProfile();
      router.push("/dashboard");
    },
    [refreshProfile, router],
  );

  /* Logout */
  const logout = useCallback(() => {
    api.clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
