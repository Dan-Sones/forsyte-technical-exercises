'use client';

import { useState } from 'react';
import { AskForsyte } from '@/features/ask-forsyte/components/ask-forsyte';
import { createAgentClient } from '@/features/ask-forsyte/create-agent-client';
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
  const { logout, getAccessToken, expireSession } = useAuth();
  // Both callbacks are stable, so one client lasts as long as the chat. A 401
  // expires the session, and the AuthGate above takes the user to /login.
  const [client] = useState(() =>
    createAgentClient({ getAccessToken, onUnauthorized: expireSession })
  );
  return <AskForsyte client={client} onLogout={logout} />;
}
