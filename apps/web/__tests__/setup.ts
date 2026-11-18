import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Vitest runs without globals, so RTL cannot register its own cleanup.
afterEach(() => {
  cleanup();
  intersectionObservers.length = 0;
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
