import { isUnexpired } from './access-token';

const STORAGE_KEY = 'ask-forsyte-access-token';

/**
 * Holds the access token in memory and mirrors it to sessionStorage, so a
 * reload keeps you signed in but closing the tab does not. Shaped for
 * useSyncExternalStore.
 */
export type SessionStore = {
  subscribe(listener: () => void): () => void;
  /** The current token, or null when signed out. */
  getSnapshot(): string | null;
  save(token: string): void;
  clear(): void;
};

export function createSessionStore(now: () => number = Date.now): SessionStore {
  // undefined until sessionStorage has been read.
  let token: string | null | undefined;
  const listeners = new Set<() => void>();

  function set(next: string | null) {
    token = next;
    writeStorage(next);
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      if (token === undefined) token = restore(now());
      return token;
    },
    save: (next) => set(next),
    clear: () => set(null),
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
