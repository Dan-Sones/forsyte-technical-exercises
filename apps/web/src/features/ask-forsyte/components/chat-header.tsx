'use client';

import { Button } from '@forsyteco/product-ui';
import { PlusIcon } from '../icons';
import { AgentAvatar } from './agent-avatar';

type ChatHeaderProps = {
  onNewChat: () => void;
  newChatDisabled: boolean;
};

export function ChatHeader({ onNewChat, newChatDisabled }: ChatHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <AgentAvatar />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg leading-tight font-semibold">Ask Forsyte</h1>
          <p className="truncate text-sm text-muted-foreground">
            Your compliance assistant
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          disabled={newChatDisabled}
          className="gap-1.5"
        >
          <PlusIcon className="size-4" />
          New chat
        </Button>
      </div>
    </header>
  );
}
