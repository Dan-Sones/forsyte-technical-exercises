'use client';

import { Label } from '@forsyteco/product-ui';

type SuggestionBarProps = {
  questions: string[];
  disabled: boolean;
  onSelect: (question: string) => void;
};

/** A single scrolling row of follow-up questions, styled like resource labels. */
export function SuggestionBar({
  questions,
  disabled,
  onSelect,
}: SuggestionBarProps) {
  if (questions.length === 0) return null;

  return (
    <ul
      aria-label="Suggested next questions"
      // -mx-4/px-4 lets the row scroll to the screen edge on mobile while
      // the first chip still lines up with the composer. The fade on the
      // right shows there's more to scroll to.
      className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 py-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] [scrollbar-width:none]"
    >
      {questions.map((question) => (
        <li key={question} className="shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Label className="cursor-pointer py-1! transition-colors group-hover:bg-muted! group-disabled:cursor-not-allowed group-disabled:bg-background!">
              {question}
            </Label>
          </button>
        </li>
      ))}
    </ul>
  );
}
