'use client';

import { useState } from 'react';
import { AskForsyte } from '@/features/ask-forsyte/components/ask-forsyte';
import { MockAgentClient } from '@/features/ask-forsyte/mock-agent-client';
import { useAuth } from '@/features/auth/auth-context';
import { AuthGate } from '@/features/auth/auth-gate';

export default function Home() {
  return (
    <AuthGate allow="authenticated" redirectTo="/login">
      <Chat />
    </AuthGate>
  );
}

function Chat() {
  const { logout } = useAuth();
  // Swap for the HTTP client, using the session's access token.
  const [client] = useState(() => new MockAgentClient());
  return <AskForsyte client={client} onLogout={logout} />;
}
