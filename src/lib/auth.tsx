import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authenticate,
  revokeSession,
  homeRouteFor,
  IDLE_TIMEOUT_SECONDS,
  type Role,
  type SessionUser,
} from "@/lib/auth-api";

const STORAGE_KEY = "las.session";

type StoredSession = {
  user: SessionUser;
  /** Expiration absolue (ms epoch). */
  expiresAt: number;
  /** Dernière activité (ms epoch) — sert au time-out d'inactivité. */
  lastActivity: number;
};

export type LogoutReason = "manual" | "expired" | "idle";

type AuthState = {
  ready: boolean;
  user: SessionUser | null;
  isAuthenticated: boolean;
  lastLogoutReason: LogoutReason | null;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  logout: (reason?: LogoutReason) => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasGroup: (group: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s?.user || typeof s.expiresAt !== "number") return null;
    return s;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function isExpired(s: StoredSession, now = Date.now()) {
  if (now >= s.expiresAt) return "expired" as const;
  if (now - s.lastActivity >= IDLE_TIMEOUT_SECONDS * 1000) return "idle" as const;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [lastLogoutReason, setLastLogoutReason] = useState<LogoutReason | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);

  const endSession = useCallback((reason: LogoutReason) => {
    sessionRef.current = null;
    writeSession(null);
    setUser(null);
    setLastLogoutReason(reason);
  }, []);

  // Hydratation + surveillance de l'expiration / inactivité
  useEffect(() => {
    const stored = readSession();
    if (stored) {
      const reason = isExpired(stored);
      if (reason) {
        writeSession(null);
        setLastLogoutReason(reason);
      } else {
        sessionRef.current = stored;
        setUser(stored.user);
      }
    }
    setReady(true);

    const touch = () => {
      const s = sessionRef.current;
      if (!s) return;
      const now = Date.now();
      if (now - s.lastActivity < 30_000) return; // limite les écritures
      s.lastActivity = now;
      writeSession(s);
    };

    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const interval = window.setInterval(() => {
      const s = sessionRef.current;
      if (!s) return;
      const reason = isExpired(s);
      if (reason) endSession(reason);
    }, 15_000);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readSession();
      sessionRef.current = next;
      setUser(next?.user ?? null);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [endSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const { user: nextUser, expiresIn } = await authenticate(identifier, password);
    const now = Date.now();
    const session: StoredSession = {
      user: nextUser,
      expiresAt: now + expiresIn * 1000,
      lastActivity: now,
    };
    sessionRef.current = session;
    writeSession(session);
    setUser(nextUser);
    setLastLogoutReason(null);
    return nextUser;
  }, []);

  const logout = useCallback(
    async (reason: LogoutReason = "manual") => {
      await revokeSession();
      endSession(reason);
    },
    [endSession],
  );

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      isAuthenticated: !!user,
      lastLogoutReason,
      login,
      logout,
      hasRole: (role) => user?.role === role,
      hasGroup: (group) => !!user?.groups.includes(group),
    }),
    [ready, user, lastLogoutReason, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { homeRouteFor };
export type { Role, SessionUser };
