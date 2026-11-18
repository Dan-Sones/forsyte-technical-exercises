import { vi } from 'vitest';

/** The object every useRouter() call returns in tests. */
export const router = {
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};
