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
import { createSessionStore, type Session } from './session-store';

export type AuthState =
  /** sessionStorage has not been read yet (server render and hydration). */
  | { status: 'loading' }
  /** `reason` is set when the API ended the session, not the user. */
  | { status: 'unauthenticated'; reason?: 'expired' }
  | { status: 'authenticated'; accessToken: string };

export type Auth = AuthState & {
  /** Resolves once signed in. Rejects with a LoginError. */
  login(email: string, password: string): Promise<void>;
  logout(): void;
  /**
   * The token right now, or null when signed out. The function itself never
   * changes, so long-lived objects such as API clients can hold on to it.
   */
  getAccessToken(): string | null;
  /**
   * For code outside this context that made a request and got a 401: signs
   * out with `reason: 'expired'`. Pass the token the request used. If the
   * user has signed in again since, it is not the current token and nothing
   * happens.
   */
  expireSession(token: string): void;
};

const AuthContext = createContext<Auth | null>(null);

// The server cannot see sessionStorage, so it renders the loading state and
// the client fills in the real session straight after hydration.
const getServerSnapshot = () => undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createSessionStore());
  const session = useSyncExternalStore(
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
  const getAccessToken = useCallback(() => store.getSnapshot().token, [store]);
  const expireSession = useCallback(
    (token: string) => store.expire(token),
    [store]
  );

  const auth = useMemo<Auth>(
    () => ({
      ...toState(session),
      login,
      logout,
      getAccessToken,
      expireSession,
    }),
    [session, login, logout, getAccessToken, expireSession]
  );

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within <AuthProvider>.');
  return auth;
}

function toState(session: Session | undefined): AuthState {
  if (session === undefined) return { status: 'loading' };
  if (session.token !== null) {
    return { status: 'authenticated', accessToken: session.token };
  }
  return session.expired
    ? { status: 'unauthenticated', reason: 'expired' }
    : { status: 'unauthenticated' };
}
