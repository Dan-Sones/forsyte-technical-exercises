'use client';

import { ThemeProvider } from '@forsyteco/product-ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultMode="system">{children}</ThemeProvider>;
}
