"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { trpc } from "@/utils/trpc";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "user" | "admin";
}

type User = SessionUser;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  requireAuth: (callback: () => void) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_REFRESHED_KEY = "pushpad_session_refreshed_at";
const DAY_MS = 24 * 60 * 60 * 1000;

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const utils = trpc.useUtils();
  // QUIRK: initialData seeds the auth.me query without a network round trip.
  // See canonical.md Topic 8.
  const { data: me, isLoading } = trpc.auth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialData: initialUser,
  });
  const user = (me as User | null | undefined) ?? null;

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(
    null,
  );

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
    setPendingCallback(null);
  }, []);

  const requireAuth = useCallback(
    (callback: () => void) => {
      if (user) {
        callback();
      } else {
        setPendingCallback(() => callback);
        setIsLoginOpen(true);
      }
    },
    [user],
  );

  // QUIRK: logout manually fetches /api/auth/csrf then POSTs to
  // /api/auth/signout. See canonical.md Topic 5.
  const logout = useCallback(async () => {
    try {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl: "/" }).toString(),
      });
    } finally {
      await utils.auth.me.invalidate();
    }
  }, [utils]);

  // Auth.js only slides the 30-day session cookie when /api/auth/session is
  // hit, and nothing else hits it, so touch it once a day while signed in.
  useEffect(() => {
    if (!user) return;
    if (Date.now() - Number(localStorage.getItem(SESSION_REFRESHED_KEY)) < DAY_MS) return;
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) localStorage.setItem(SESSION_REFRESHED_KEY, String(Date.now()));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user && pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
      setIsLoginOpen(false);
    }
  }, [user, pendingCallback]);

  // Global auth:token-invalid event — invalidates auth.me and prompts login.
  useEffect(() => {
    const handler = () => {
      utils.auth.me.invalidate();
      setIsLoginOpen(true);
    };
    window.addEventListener("auth:token-invalid", handler);
    return () => window.removeEventListener("auth:token-invalid", handler);
  }, [utils]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoginOpen,
        openLogin,
        closeLogin,
        requireAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
