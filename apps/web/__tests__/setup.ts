import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './msw-server';
import { router } from './router-mock';

// Every request must hit a handler, so a test cannot reach a real API.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

// Vitest runs without globals, so RTL cannot register its own cleanup.
afterEach(() => {
  cleanup();
  intersectionObservers.length = 0;
  server.resetHandlers();
  window.sessionStorage.clear();
  Object.values(router).forEach((fn) => fn.mockClear());
});

// The App Router is not mounted in tests. Assert on `router` instead.
vi.mock('next/navigation', async () => {
  const { router } = await import('./router-mock');
  return { useRouter: () => router };
});

// jsdom has no layout, so these browser APIs are missing. The stubs below
// give components something to call and let tests drive the results.

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  targets: Element[];
};

const intersectionObservers: ObserverRecord[] = [];

class IntersectionObserverStub {
  private record: ObserverRecord;

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, targets: [] };
    intersectionObservers.push(this.record);
  }

  observe(target: Element) {
    this.record.targets.push(target);
  }

  unobserve(target: Element) {
    this.record.targets = this.record.targets.filter((t) => t !== target);
  }

  disconnect() {
    this.record.targets = [];
  }

  takeRecords() {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

/** Report every observed element as in or out of view. */
export function setIntersecting(isIntersecting: boolean) {
  for (const { callback, targets } of intersectionObservers) {
    if (targets.length === 0) continue;
    const entries = targets.map(
      (target) => ({ target, isIntersecting }) as IntersectionObserverEntry
    );
    callback(entries, {} as IntersectionObserver);
  }
}

Element.prototype.scrollIntoView = vi.fn();

vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
);
