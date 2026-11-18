'use client';

import { Button, Label } from '@forsyteco/product-ui';
import type { AgentMessageResource } from '../types';
import { AgentAvatar } from './agent-avatar';
import { Markdown } from './markdown';

// Agent rows share one layout: a fixed avatar column, then the content, so
// text, the thinking dots and errors all line up.
function AgentRow({
  showAvatar = true,
  children,
  ...props
}: React.ComponentProps<'div'> & { showAvatar?: boolean }) {
  return (
    <div className="flex gap-3" {...props}>
      <div className="w-8 shrink-0">{showAvatar && <AgentAvatar />}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <article aria-label="You" className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 break-words whitespace-pre-wrap text-user-bubble-foreground">
        {text}
      </p>
    </article>
  );
}

/** "mattersWithOutstandingRiskAssessments" → "Matters with outstanding risk assessments" */
function describeResource(rel: string) {
  const words = rel.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type AgentMessageProps = {
  text: string;
  resources?: AgentMessageResource[];
  /** Only the first of consecutive agent messages shows the avatar. */
  showAvatar: boolean;
};

export function AgentMessage({
  text,
  resources,
  showAvatar,
}: AgentMessageProps) {
  return (
    <article aria-label="Forsyte">
      <AgentRow showAvatar={showAvatar}>
        <div className="pt-1.5">
          <Markdown text={text} />
        </div>
        {resources && resources.length > 0 && (
          // The hrefs are API paths, not app pages, so these aren't links yet.
          <ul aria-label="Sources" className="mt-3 flex flex-wrap gap-2">
            {resources.map((resource) => (
              <li key={resource.rel}>
                <Label className="py-1!">
                  {describeResource(resource.rel)}
                </Label>
              </li>
            ))}
          </ul>
        )}
      </AgentRow>
    </article>
  );
}

export function ThinkingIndicator() {
  return (
    <AgentRow role="status">
      <div className="flex h-8 items-center gap-1" aria-hidden>
        {['[animation-delay:-0.3s]', '[animation-delay:-0.15s]', ''].map(
          (delay) => (
            <span
              key={delay}
              className={`size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none ${delay}`}
            />
          )
        )}
      </div>
      <span className="sr-only">Forsyte is thinking</span>
    </AgentRow>
  );
}

type SendErrorProps = { message: string; onRetry: () => void };

export function SendError({ message, onRetry }: SendErrorProps) {
  return (
    <AgentRow showAvatar={false} role="alert">
      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-destructive/30 bg-destructive/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-destructive">Message not sent</p>
          <p className="text-sm break-words text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </AgentRow>
  );
}
