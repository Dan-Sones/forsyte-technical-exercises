'use client';

import { Button, FormField, Input } from '@forsyteco/product-ui';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth-context';
import { LoginError, type LoginErrorKind } from '../login-request';

const ERROR_MESSAGES: Record<LoginErrorKind, string> = {
  'invalid-credentials': 'Incorrect email or password.',
  network: "Couldn't reach the server. Try again.",
  unexpected: 'Something went wrong. Try again.',
};

/**
 * Email and password sign-in. On success the session changes and the route's
 * AuthGate takes the user on; this form only handles pending and errors.
 */
export function LoginForm() {
  const { login } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<LoginErrorKind | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const form = new FormData(event.currentTarget);
    setError(null);
    setIsPending(true);
    try {
      await login(String(form.get('email')), String(form.get('password')));
    } catch (cause) {
      setError(cause instanceof LoginError ? cause.kind : 'unexpected');
    } finally {
      setIsPending(false);
    }
  }

  // Wrong credentials belong to the fields. Anything else is about the
  // request, so it gets a message of its own.
  const credentialsRejected = error === 'invalid-credentials';

  return (
    <form
      aria-label="Sign in"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <FormField>
        <FormField.Label>Email</FormField.Label>
        <FormField.Control describedBy="none">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            error={credentialsRejected}
          />
        </FormField.Control>
      </FormField>

      <FormField>
        <FormField.Label>Password</FormField.Label>
        <FormField.Control describedBy="error">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={credentialsRejected}
          />
        </FormField.Control>
        <FormField.Error>
          {credentialsRejected ? ERROR_MESSAGES[error] : null}
        </FormField.Error>
      </FormField>

      {error && !credentialsRejected && (
        <p role="alert" className="text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <Button
        type="submit"
        loading={isPending}
        // The spinner replaces the label, so keep the button named.
        aria-label={isPending ? 'Signing in' : undefined}
        className="w-full"
      >
        Sign in
      </Button>
    </form>
  );
}
