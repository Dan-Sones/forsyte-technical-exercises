import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  AgentMessage,
  UserMessage,
} from '@/features/ask-forsyte/components/messages';
import { JOURNEY_STEPS } from '@/features/ask-forsyte/fixtures';

function renderAgent(text: string) {
  render(<AgentMessage text={text} showAvatar />);
  return screen.getByRole('article', { name: 'Forsyte' });
}

describe('AgentMessage markdown', () => {
  test('renders paragraphs and a bullet list', () => {
    const beekeeperFlags = JOURNEY_STEPS[2].answers[0].text;
    const message = renderAgent(beekeeperFlags);

    const paragraphs = message.querySelectorAll('p');
    expect([...paragraphs].map((p) => p.textContent)).toEqual([
      'Here are the seeded risk assessment flags for the Beekeeper employment contract:',
      'I will summarise what this means and suggested next steps next.',
    ]);

    const items = within(within(message).getByRole('list')).getAllByRole(
      'listitem'
    );
    expect(items.map((item) => item.textContent)).toEqual([
      'Remote identity verification: accepted',
      'Identity confidence: accepted',
      'Sanctions screening: accepted',
      'Adverse media: pending',
      'High-risk third country residence: pending',
    ]);
  });

  test('renders emphasis and inline code', () => {
    const message = renderAgent('**2 matters** are *in progress*: `RA-1`');

    expect(message.querySelector('strong')?.textContent).toBe('2 matters');
    expect(message.querySelector('em')?.textContent).toBe('in progress');
    expect(message.querySelector('code')?.textContent).toBe('RA-1');
  });

  test('escapes raw HTML instead of rendering it', () => {
    const message = renderAgent(
      'Before <b onclick="alert(1)">bold</b> after\n\n<script>alert(1)</script>'
    );

    expect(message.textContent).toContain(
      'Before <b onclick="alert(1)">bold</b> after'
    );
    expect(message.textContent).toContain('<script>alert(1)</script>');
    expect(message.querySelector('b')).toBeNull();
    expect(message.querySelector('script')).toBeNull();
    expect(message.querySelector('[onclick]')).toBeNull();
  });

  test('strips javascript: links', () => {
    const message = renderAgent('[Click me](javascript:alert(1))');

    const anchor = message.querySelector('a');
    expect(anchor?.textContent).toBe('Click me');
    expect(anchor?.getAttribute('href') ?? '').not.toMatch(/javascript:/i);
  });

  test('opens outside links in a new tab', () => {
    const message = renderAgent('See [the guidance](https://example.com/aml).');

    const link = within(message).getByRole('link', { name: 'the guidance' });
    expect(link.getAttribute('href')).toBe('https://example.com/aml');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('keeps relative links in the same tab', () => {
    const message = renderAgent('Go to [matters](/matters).');

    const link = within(message).getByRole('link', { name: 'matters' });
    expect(link.getAttribute('href')).toBe('/matters');
    expect(link.getAttribute('target')).toBeNull();
  });

  test('shows an image as its alt text without loading it', () => {
    const message = renderAgent('![Risk chart](https://example.com/chart.png)');

    expect(message.querySelector('img[src*="chart"]')).toBeNull();
    expect(within(message).getByText('Risk chart')).toBeDefined();
  });
});

describe('UserMessage', () => {
  test('shows the text as typed, not as markdown', () => {
    const text = '- not a list\n\n**not bold** <b>not html</b>';
    render(<UserMessage text={text} />);

    const message = screen.getByRole('article', { name: 'You' });
    expect(message.textContent).toBe(text);
    expect(within(message).queryByRole('list')).toBeNull();
    expect(message.querySelector('strong, b')).toBeNull();
  });
});
