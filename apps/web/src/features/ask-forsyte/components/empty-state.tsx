'use client';

import { Button } from '@forsyteco/product-ui';
import { AgentAvatar } from './agent-avatar';

type EmptyStateProps = {
  suggestions: string[];
  onSelect: (question: string) => void;
};

export function EmptyState({ suggestions, onSelect }: EmptyStateProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* min-h-full + centring keeps it centred, but scrollable if it's taller. */}
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-8 text-center">
        <AgentAvatar className="size-14" />
        <h2 className="mt-4 text-2xl font-semibold">How can I help?</h2>
        <p className="mt-1 text-muted-foreground">
          Ask about your matters and risk assessments, or try one of these.
        </p>
        <ul
          aria-label="Suggested questions"
          className="mt-6 grid w-full gap-3 sm:grid-cols-2"
        >
          {suggestions.map((question) => (
            <li key={question} className="flex">
              <Button
                variant="outline"
                onClick={() => onSelect(question)}
                className="w-full justify-start! rounded-[12px]! p-4! text-left font-normal!"
              >
                {question}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
