'use client';

import { Button } from '@forsyteco/product-ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownIcon } from '../icons';
import type { AgentMessage as Message } from '../types';
import type { ChatError } from '../use-agent-chat';
import {
  AgentMessage,
  SendError,
  ThinkingIndicator,
  UserMessage,
} from './messages';

type MessageThreadProps = {
  messages: Message[];
  isPending: boolean;
  error: ChatError | null;
  onRetry: () => void;
};

export function MessageThread({
  messages,
  isPending,
  error,
  onRetry,
}: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Mirrors isAtBottom for the scroll effect, which shouldn't re-run on it.
  const isAtBottomRef = useRef(true);
  const lastSeenId = useRef<string | undefined>(undefined);

  // Watch a marker at the end of the thread to know if the user is at the bottom.
  useEffect(() => {
    const bottom = bottomRef.current;
    if (!bottom) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isAtBottomRef.current = entry.isIntersecting;
        setIsAtBottom(entry.isIntersecting);
      },
      // Count "nearly at the bottom" as at the bottom.
      { root: scrollRef.current, rootMargin: '0px 0px 48px 0px' }
    );
    observer.observe(bottom);
    return () => observer.disconnect();
  }, []);

  const last = messages.at(-1);

  // Always follow your own message. Follow replies (and the thinking dots)
  // only if you were already at the bottom, so reading history isn't yanked.
  // A layout effect runs before the observer sees the taller thread.
  useLayoutEffect(() => {
    const userJustSent =
      last?.role === 'user' && last.id !== lastSeenId.current;
    lastSeenId.current = last?.id;
    if (userJustSent || isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [last?.id, last?.role, isPending, error]);

  const visible = messages.filter((m) => m.content);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div
          role="log"
          aria-label="Conversation"
          className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-6 pb-8"
        >
          {visible.map((message, index) => {
            const previous = visible[index - 1];
            const continuesAgentRun =
              message.role === 'agent' && previous?.role === 'agent';
            const spacing =
              index === 0 ? '' : continuesAgentRun ? 'mt-2' : 'mt-6';
            const text = message.content?.text ?? '';

            return (
              <div key={message.id} className={spacing}>
                {message.role === 'user' ? (
                  <UserMessage text={text} />
                ) : (
                  <AgentMessage
                    text={text}
                    resources={message.content?.resources}
                    showAvatar={!continuesAgentRun}
                  />
                )}
              </div>
            );
          })}

          {isPending && (
            <div className="mt-6">
              <ThinkingIndicator />
            </div>
          )}
          {error && !isPending && (
            <div className="mt-4">
              <SendError message={error.message} onRetry={onRetry} />
            </div>
          )}

          <div ref={bottomRef} aria-hidden className="h-px" />
        </div>
      </div>

      {!isAtBottom && (
        <Button
          icon={ArrowDownIcon}
          aria-label="Scroll to latest message"
          variant="outline"
          shape="circle"
          size="sm"
          onClick={() =>
            bottomRef.current?.scrollIntoView({
              block: 'end',
              behavior: 'smooth',
            })
          }
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background! shadow-md"
        />
      )}
    </div>
  );
}
