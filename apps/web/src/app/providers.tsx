'use client';

import { ThemeProvider } from '@forsyteco/product-ui';
import { AuthProvider } from '@/features/auth/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultMode="system">
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
