'use client';

import { useRef } from 'react';
import type { AgentClient } from '../agent-client';
import { SUGGESTED_QUESTIONS } from '../fixtures';
import { useAgentChat } from '../use-agent-chat';
import { ChatHeader } from './chat-header';
import { Composer, type ComposerHandle } from './composer';
import { EmptyState } from './empty-state';
import { MessageThread } from './message-thread';
import { SuggestionBar } from './suggestion-bar';

export function AskForsyte({ client }: { client: AgentClient }) {
  const { messages, isPending, error, send, retry, reset } =
    useAgentChat(client);
  const composerRef = useRef<ComposerHandle>(null);

  function startNewChat() {
    reset();
    composerRef.current?.focus();
  }

  function askSuggestion(question: string) {
    send(question);
    composerRef.current?.focus();
  }

  return (
    // Three bands: header, scrolling thread, composer. h-dvh follows the
    // mobile keyboard and browser chrome.
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <ChatHeader onNewChat={startNewChat} newChatDisabled={isPending} />

      <main className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <EmptyState
            suggestions={SUGGESTED_QUESTIONS}
            onSelect={askSuggestion}
          />
        ) : (
          <MessageThread
            messages={messages}
            isPending={isPending}
            error={error}
            onRetry={retry}
          />
        )}

        <div className="shrink-0 bg-background pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-3xl px-4">
            {messages.length > 0 && (
              <SuggestionBar
                questions={SUGGESTED_QUESTIONS}
                disabled={isPending}
                onSelect={askSuggestion}
              />
            )}
            <Composer ref={composerRef} onSend={send} isPending={isPending} />
          </div>
        </div>
      </main>
    </div>
  );
}
