"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getStoredUser, subscribeAuth, type AuthUser } from "./auth";

type AuthState = {
  ready: boolean;
  authed: boolean;
  user: AuthUser | null;
};

/** Reactive snapshot of the local auth state (SSR-safe). */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authed: false,
    user: null,
  });

  useEffect(() => {
    const sync = () =>
      setState({
        ready: true,
        authed: !!getToken(),
        user: getStoredUser(),
      });
    sync();
    return subscribeAuth(sync);
  }, []);

  return state;
}

/** Redirect to `/` when not authenticated. Returns auth state. */
export function useRequireAuth(): AuthState {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.ready && !auth.authed) router.replace("/");
  }, [auth.ready, auth.authed, router]);
  return auth;
}
