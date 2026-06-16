import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken } from "./api";

const TOKEN_KEY = "rf_token";
const EMAIL_KEY = "rf_email";

type SessionState = {
  ready: boolean;
  token: string | null;
  user: { id: string; email: string; name?: string } | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Passwordless session for the mobile client. The token is persisted in the
 * device keychain via expo-secure-store and re-applied to the API client on
 * launch so calls are authenticated.
 */
export const useSession = create<SessionState>((set) => ({
  ready: false,
  token: null,
  user: null,

  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        const user = await api.me().catch(() => null);
        set({ token, user, ready: true });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ ready: true });
  },

  signIn: async (email, name) => {
    const { token, user } = await api.session(email, name);
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(EMAIL_KEY, email);
    set({ token, user });
  },

  signOut: async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
