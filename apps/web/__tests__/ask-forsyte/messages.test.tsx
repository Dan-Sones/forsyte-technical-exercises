import { render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
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

  test('shows an unsafe link as plain text', () => {
    const message = renderAgent(
      'Try [javascript](javascript:alert(1)), [data](data:text/html,x) or [vb](vbscript:msgbox(1)).'
    );

    expect(message.querySelector('a')).toBeNull();
    expect(message.textContent).toContain('Try javascript, data or vb.');
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

describe('AgentMessage sources', () => {
  const resources = [
    {
      rel: 'mattersWithOutstandingRiskAssessments',
      href: '/v1/matters?riskAssessmentStatus=in_progress',
    },
    { rel: 'riskAssessmentDetails', href: '/v1/risk-assessments/1' },
  ];

  test('lists them under a visible Sources heading', () => {
    render(<AgentMessage text="See below." resources={resources} showAvatar />);
    const message = screen.getByRole('article', { name: 'Forsyte' });

    const heading = within(message).getByText('Sources');
    const sources = within(message).getByRole('list', { name: 'Sources' });
    expect(sources.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(
      within(sources)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([
      'Matters with outstanding risk assessments',
      'Risk assessment details',
    ]);
  });

  test('are labels, not links or buttons', () => {
    render(<AgentMessage text="See below." resources={resources} showAvatar />);
    const sources = screen.getByRole('list', { name: 'Sources' });

    expect(within(sources).queryByRole('link')).toBeNull();
    expect(within(sources).queryByRole('button')).toBeNull();
  });

  test('keeps resources that share a rel', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AgentMessage
        text="Two assessments."
        resources={[
          { rel: 'riskAssessmentDetails', href: '/v1/risk-assessments/1' },
          { rel: 'riskAssessmentDetails', href: '/v1/risk-assessments/2' },
        ]}
        showAvatar
      />
    );

    const sources = screen.getByRole('list', { name: 'Sources' });
    expect(within(sources).getAllByRole('listitem')).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  test('shows no Sources heading without resources', () => {
    render(<AgentMessage text="Plain answer." resources={[]} showAvatar />);

    expect(screen.queryByText('Sources')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Sources' })).toBeNull();
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
