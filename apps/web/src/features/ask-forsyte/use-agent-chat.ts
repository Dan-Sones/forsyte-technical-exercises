import { useState } from 'react';
import type { AgentClient } from './agent-client';
import { ORGANISATION_SLUG, WIRED_AGENT_SLUG } from './config';
import type { AgentMessage } from './types';

export type ChatError = { message: string; failedMessageId: string };

type UseAgentChatOptions = {
  /** Existing history, in any order. */
  initialMessages?: AgentMessage[];
};

const bySequence = (messages: AgentMessage[]) =>
  [...messages].sort((a, b) => a.sequenceId - b.sequenceId);

export function useAgentChat(
  client: AgentClient,
  { initialMessages = [] }: UseAgentChatOptions = {}
) {
  const [messages, setMessages] = useState(() => bySequence(initialMessages));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);

  async function startSession() {
    const agents = await client.listAgents(ORGANISATION_SLUG);
    const agent = agents.find((a) => a.slug === WIRED_AGENT_SLUG);
    if (!agent) {
      throw new Error('Ask Forsyte is not available for this organisation.');
    }
    const session = await client.createSession(ORGANISATION_SLUG, agent.id);
    setSessionId(session.id);
    return session.id;
  }

  async function request(text: string, userMessageId: string) {
    setIsPending(true);
    setError(null);
    try {
      const id = sessionId ?? (await startSession());
      const reply = await client.sendMessage(ORGANISATION_SLUG, id, text);
      setMessages((prev) => bySequence([...prev, reply]));
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Something went wrong.',
        failedMessageId: userMessageId,
      });
    } finally {
      setIsPending(false);
    }
  }

  /** Returns false when nothing was sent (blank text, or a reply is pending). */
  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return false;

    const failedId = error?.failedMessageId;
    const id = `local-${crypto.randomUUID()}`;

    // The API doesn't return the user's message, so add it ourselves. Its
    // sequenceId follows the last message, which matches how the API counts.
    // A failed message was never saved, so the new one takes its place.
    setMessages((prev) => {
      const kept = prev.filter((m) => m.id !== failedId);
      const lastSequenceId = kept.at(-1)?.sequenceId ?? 0;
      return [
        ...kept,
        {
          id,
          sessionId: sessionId ?? '',
          role: 'user',
          sequenceId: lastSequenceId + 1,
          content: { text: trimmed },
          createdAt: new Date().toISOString(),
        },
      ];
    });

    void request(trimmed, id);
    return true;
  }

  function retry() {
    if (!error || isPending) return;
    const failed = messages.find((m) => m.id === error.failedMessageId);
    if (failed?.content) void request(failed.content.text, failed.id);
  }

  function reset() {
    if (isPending) return;
    setMessages([]);
    setSessionId(null);
    setError(null);
  }

  return { messages, isPending, error, send, retry, reset };
}
