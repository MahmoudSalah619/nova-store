"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE, type Product } from "@/lib/types";

type User = { id: string; name: string; email: string };

/** The sign-in response has no user id, but the token's payload does ({ id, name, role }). */
function userIdFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).id ?? null;
  } catch {
    return null;
  }
}

type AccountContextValue = {
  user: User | null;
  ready: boolean;
  /** Call an endpoint that needs the signed-in user's token. Signs out on 401. */
  api: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { name: string; email: string; phone: string; password: string; rePassword: string }) => Promise<void>;
  signOut: () => void;
  /** Product ids on the signed-in user's wishlist. */
  wishlistIds: Set<string>;
  wishlist: Product[];
  wishlistLoading: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);
const STORAGE_KEY = "nova-account";

/** Pull a readable message out of the API's two error shapes. */
async function apiError(res: Response) {
  try {
    const body = await res.json();
    return body?.errors?.msg ?? body?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.token) {
        const id = saved.user?.id ?? userIdFromToken(saved.token);
        setToken(saved.token);
        setUser(id ? { ...saved.user, id } : null);
      }
    } catch {}
    setReady(true);
  }, []);

  const save = (t: string | null, u: User | null) => {
    setToken(t);
    setUser(u);
    try {
      if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const signOut = useCallback(() => {
    save(null, null);
    setWishlist([]);
    setWishlistIds(new Set());
  }, []);

  const authed = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!token) throw new Error("Please sign in first");
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", token, ...init.headers },
      });
      if (res.status === 401) {
        signOut(); // token expired or revoked
        throw new Error("Your session expired. Please sign in again.");
      }
      if (!res.ok) throw new Error(await apiError(res));
      return res.json();
    },
    [token, signOut],
  );

  // Load the wishlist whenever we have a token.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setWishlistLoading(true);
    authed("/wishlist")
      .then((json: { data: Product[] }) => {
        if (cancelled) return;
        setWishlist(json.data);
        setWishlistIds(new Set(json.data.map((p) => p._id)));
      })
      .catch(() => {})
      .finally(() => !cancelled && setWishlistLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, authed]);

  const auth = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await apiError(res));
    const json: { token: string; user: { name: string; email: string } } = await res.json();
    let id = userIdFromToken(json.token);
    if (!id) {
      // Fall back to asking the API who this token belongs to.
      const check = await fetch(`${API_BASE}/auth/verifyToken`, { headers: { token: json.token } });
      id = check.ok ? (await check.json())?.decoded?.id ?? null : null;
    }
    if (!id) throw new Error("Signed in, but couldn't read your account id. Please try again.");
    save(json.token, { id, name: json.user.name, email: json.user.email });
  };

  const signIn = useCallback((email: string, password: string) => auth("/auth/signin", { email, password }), []);
  const signUp = useCallback<AccountContextValue["signUp"]>((data) => auth("/auth/signup", data), []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const has = wishlistIds.has(productId);
      // Optimistic update; the API answers with the new list of ids.
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        const json: { data: string[] } = has
          ? await authed(`/wishlist/${productId}`, { method: "DELETE" })
          : await authed("/wishlist", { method: "POST", body: JSON.stringify({ productId }) });
        setWishlistIds(new Set(json.data));
        if (has) setWishlist((list) => list.filter((p) => p._id !== productId));
        else {
          const full = await authed("/wishlist");
          setWishlist(full.data);
        }
      } catch (err) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw err;
      }
    },
    [wishlistIds, authed],
  );

  const value = useMemo(
    () => ({ user, ready, api: authed as AccountContextValue["api"], signIn, signUp, signOut, wishlistIds, wishlist, wishlistLoading, toggleWishlist }),
    [user, ready, authed, signIn, signUp, signOut, wishlistIds, wishlist, wishlistLoading, toggleWishlist],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
