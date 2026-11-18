'use client';

import { useState } from 'react';
import { AskForsyte } from '@/features/ask-forsyte/components/ask-forsyte';
import { MockAgentClient } from '@/features/ask-forsyte/mock-agent-client';

export default function Home() {
  // Swap for the HTTP client in exercise 2.
  const [client] = useState(() => new MockAgentClient());
  return <AskForsyte client={client} />;
}
