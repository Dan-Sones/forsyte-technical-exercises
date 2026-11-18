import type { Metadata } from 'next';
import { AuthGate } from '@/features/auth/auth-gate';
import { LoginScreen } from '@/features/auth/components/login-screen';

export const metadata: Metadata = {
  title: 'Sign in · Ask Forsyte',
};

export default function LoginPage() {
  return (
    <AuthGate allow="unauthenticated" redirectTo="/">
      <LoginScreen />
    </AuthGate>
  );
}
