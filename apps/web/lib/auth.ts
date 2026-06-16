"use client";

const TOKEN_KEY = "resumeforge.token";
const USER_KEY = "resumeforge.user";

export type AuthUser = { id: string; email: string; name?: string | null };

const isBrowser = typeof window !== "undefined";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getToken(): string | null {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (!isBrowser) return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function getStoredUser(): AuthUser | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (!isBrowser) return;
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function isAuthed(): boolean {
  return !!getToken();
}

export function signOut(): void {
  setToken(null);
  setStoredUser(null);
}
