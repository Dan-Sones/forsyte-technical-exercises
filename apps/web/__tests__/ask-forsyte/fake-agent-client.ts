import { vi } from 'vitest';
import type { AgentClient } from '@/features/ask-forsyte/agent-client';
import { AGENTS } from '@/features/ask-forsyte/fixtures';
import type { AgentMessage } from '@/features/ask-forsyte/types';

type PendingSend = {
  text: string;
  resolve: (message: AgentMessage) => void;
  reject: (error: Error) => void;
};

export function agentMessage(
  sequenceId: number,
  text: string,
  overrides: Partial<AgentMessage> = {}
): AgentMessage {
  return {
    id: `msg_${sequenceId}`,
    sessionId: 'ses_test',
    role: 'agent',
    sequenceId,
    content: { text },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * An AgentClient whose replies the test controls. Each sendMessage call
 * waits until the test calls reply() or fail().
 */
export function createFakeAgentClient() {
  const pending: PendingSend[] = [];
  let nextSessionNumber = 1;

  const client = {
    listAgents: vi.fn(async () => AGENTS),
    createSession: vi.fn(async (_org: string, agentId: string) => ({
      id: `ses_${nextSessionNumber++}`,
      agentId,
      organisationId: 'org_test',
      createdAt: '2026-01-01T00:00:00.000Z',
    })),
    sendMessage: vi.fn(
      (_org: string, _sessionId: string, text: string) =>
        new Promise<AgentMessage>((resolve, reject) => {
          pending.push({ text, resolve, reject });
        })
    ),
  } satisfies AgentClient;

  function next() {
    const call = pending.shift();
    if (!call) throw new Error('No sendMessage call is waiting for a reply');
    return call;
  }

  return {
    client,
    /** Resolve the oldest waiting sendMessage call. */
    reply: (message: AgentMessage) => next().resolve(message),
    /** Reject the oldest waiting sendMessage call. */
    fail: (message: string) => next().reject(new Error(message)),
  };
}
