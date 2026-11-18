import { isUnexpired } from './access-token';

const STORAGE_KEY = 'ask-forsyte-access-token';

export type Session = {
  /** The current token, or null when signed out. */
  token: string | null;
  /**
   * True when the API rejected the token, rather than the user signing out.
   * Kept in memory only, so a reload forgets it.
   */
  expired: boolean;
};

/**
 * Holds the access token in memory and mirrors it to sessionStorage, so a
 * reload keeps you signed in but closing the tab does not. Shaped for
 * useSyncExternalStore: the snapshot object only changes when the session
 * does.
 */
export type SessionStore = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): Session;
  save(token: string): void;
  clear(): void;
  /**
   * Signs out because the API rejected `token`. Does nothing unless `token`
   * is still the current one, so a late 401 for an old token cannot end a
   * newer session.
   */
  expire(token: string): void;
};

export function createSessionStore(now: () => number = Date.now): SessionStore {
  // undefined until sessionStorage has been read.
  let session: Session | undefined;
  const listeners = new Set<() => void>();

  function getSnapshot() {
    if (session === undefined) {
      session = { token: restore(now()), expired: false };
    }
    return session;
  }

  function set(next: Session) {
    session = next;
    writeStorage(next.token);
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot,
    save: (token) => set({ token, expired: false }),
    clear: () => set({ token: null, expired: false }),
    expire(token) {
      if (getSnapshot().token !== token) return;
      set({ token: null, expired: true });
    },
  };
}

function restore(nowMs: number): string | null {
  const stored = readStorage();
  if (stored === null) return null;
  if (isUnexpired(stored, nowMs)) return stored;

  writeStorage(null);
  return null;
}

// Storage can be missing or throw (private windows, blocked site data).
// Then the session simply lives in memory only.

function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(token: string | null) {
  try {
    if (token === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Keep the in-memory session.
  }
}
