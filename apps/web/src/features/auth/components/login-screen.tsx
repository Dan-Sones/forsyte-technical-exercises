'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageLayout,
  PageLayoutContent,
} from '@forsyteco/product-ui';
import { AgentAvatar } from '@/features/ask-forsyte/components/agent-avatar';
import { useAuth } from '../auth-context';
import { LoginForm } from './login-form';

export function LoginScreen() {
  const auth = useAuth();
  const expired =
    auth.status === 'unauthenticated' && auth.reason === 'expired';

  return (
    <PageLayout className="flex min-h-dvh items-center bg-background text-foreground">
      <PageLayoutContent padding="normal" className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <AgentAvatar />
          <h1 className="text-2xl font-semibold">Ask Forsyte</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            {expired ? (
              // A status, not an alert: nothing went wrong on this page.
              <CardDescription role="status">
                Your session has expired. Sign in again to continue.
              </CardDescription>
            ) : (
              <CardDescription>
                Use your Forsyte account to talk to your compliance assistant.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </PageLayoutContent>
    </PageLayout>
  );
}
