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
import { LoginForm } from './login-form';

export function LoginScreen() {
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
            <CardDescription>
              Use your Forsyte account to talk to your compliance assistant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </PageLayoutContent>
    </PageLayout>
  );
}
