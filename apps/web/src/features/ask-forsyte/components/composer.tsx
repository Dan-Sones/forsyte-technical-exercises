'use client';

import { Button, Textarea } from '@forsyteco/product-ui';
import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpIcon } from '../icons';

export type ComposerHandle = { focus: () => void };

type ComposerProps = {
  /** Returns false if the message wasn't sent, so the text is kept. */
  onSend: (text: string) => boolean;
  isPending: boolean;
  ref?: React.Ref<ComposerHandle>;
};

// On touch keyboards Return means "new line"; people send with the button.
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

export function Composer({ onSend, isPending, ref }: ComposerProps) {
  const [value, setValue] = useState('');
  // product-ui's Textarea doesn't type a ref prop, so find it in the wrapper.
  const fieldRef = useRef<HTMLDivElement>(null);
  const textarea = () => fieldRef.current?.querySelector('textarea');

  useImperativeHandle(ref, () => ({ focus: () => textarea()?.focus() }), []);

  // Grow with the content; max-h caps it and the textarea scrolls after that.
  useLayoutEffect(() => {
    const el = textarea();
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isPending;

  function submit() {
    if (canSend && onSend(value)) setValue('');
    textarea()?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    if (isTouchDevice()) return;
    e.preventDefault();
    submit();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div
        ref={fieldRef}
        className="flex items-end gap-2 rounded-3xl border border-border bg-background p-2 shadow-[0_8px_30px_rgb(0_0_0/0.08)] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--field-input-active-border))] focus-within:shadow-[0_0_0_3px_var(--field-input-halo),0_8px_30px_rgb(0_0_0/0.08)]"
      >
        <Textarea
          aria-label="Message Ask Forsyte"
          placeholder="Ask about your matters…"
          rows={1}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          // 16px text stops iOS zooming in on focus.
          className="max-h-48 resize-none overflow-y-auto rounded-none! border-0! bg-transparent! px-3! py-2! text-lg! shadow-none!"
        />
        <Button
          type="submit"
          icon={ArrowUpIcon}
          aria-label="Send message"
          keybindingHint="Enter"
          shape="circle"
          disabled={!canSend}
          className="shrink-0"
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground pointer-coarse:hidden">
        Enter to send · Shift + Enter for a new line
      </p>
    </form>
  );
}
