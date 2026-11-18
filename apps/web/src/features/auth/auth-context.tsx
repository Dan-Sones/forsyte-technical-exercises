'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { requestAccessToken } from './login-request';
import { createSessionStore } from './session-store';

export type AuthState =
  /** sessionStorage has not been read yet (server render and hydration). */
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; accessToken: string };

export type Auth = AuthState & {
  /** Resolves once signed in. Rejects with a LoginError. */
  login(email: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<Auth | null>(null);

// The server cannot see sessionStorage, so it renders the loading state and
// the client fills in the real session straight after hydration.
const getServerSnapshot = () => undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createSessionStore());
  const token = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot
  );

  const login = useCallback(
    async (email: string, password: string) => {
      store.save(await requestAccessToken(email, password));
    },
    [store]
  );
  const logout = useCallback(() => store.clear(), [store]);

  const auth = useMemo<Auth>(
    () => ({ ...toState(token), login, logout }),
    [token, login, logout]
  );

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within <AuthProvider>.');
  return auth;
}

function toState(token: string | null | undefined): AuthState {
  if (token === undefined) return { status: 'loading' };
  if (token === null) return { status: 'unauthenticated' };
  return { status: 'authenticated', accessToken: token };
}
