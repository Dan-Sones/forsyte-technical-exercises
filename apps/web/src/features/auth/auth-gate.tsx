'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

type AuthGateProps = {
  /** The auth status this route is for. */
  allow: 'authenticated' | 'unauthenticated';
  /** Where to send anyone with the other status. */
  redirectTo: string;
  children: React.ReactNode;
};

/**
 * Renders its children only for the allowed auth status and redirects
 * everyone else. Renders nothing while the session is loading.
 */
export function AuthGate({ allow, redirectTo, children }: AuthGateProps) {
  const { status } = useAuth();
  const router = useRouter();
  const shouldRedirect = status !== 'loading' && status !== allow;

  useEffect(() => {
    if (shouldRedirect) router.replace(redirectTo);
  }, [shouldRedirect, redirectTo, router]);

  return status === allow ? children : null;
}
