'use client';

import { Button, Label } from '@forsyteco/product-ui';
import { useId } from 'react';
import { DocumentIcon } from '../icons';
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
        {resources && resources.length > 0 && <Sources resources={resources} />}
      </AgentRow>
    </article>
  );
}

const SOURCE_UNAVAILABLE = "Opening sources isn't available yet";

// Sources are buttons so they read as actions, but the hrefs are API paths,
// not app pages, so there is nothing to open yet. aria-disabled (not
// disabled) keeps them focusable, and the description says why.
function Sources({ resources }: { resources: AgentMessageResource[] }) {
  const headingId = useId();
  const unavailableId = useId();
  return (
    <div className="mt-3">
      <p
        id={headingId}
        className="mb-1.5 text-sm font-semibold text-muted-foreground"
      >
        Sources
      </p>
      {/* Hidden from reading order; aria-describedby still reads it. */}
      <span id={unavailableId} hidden>
        {SOURCE_UNAVAILABLE}
      </span>
      <ul aria-labelledby={headingId} className="flex flex-wrap gap-2">
        {resources.map((resource) => (
          <li key={`${resource.rel} ${resource.href}`}>
            <button
              type="button"
              aria-disabled="true"
              aria-describedby={unavailableId}
              title={SOURCE_UNAVAILABLE}
              className="cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Label className="gap-1.5 py-1!">
                <DocumentIcon className="size-3.5 shrink-0 text-muted-foreground" />
                {describeResource(resource.rel)}
              </Label>
            </button>
          </li>
        ))}
      </ul>
    </div>
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
