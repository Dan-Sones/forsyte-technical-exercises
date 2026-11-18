import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AskForsyte } from '@/features/ask-forsyte/components/ask-forsyte';
import { SUGGESTED_QUESTIONS } from '@/features/ask-forsyte/fixtures';
import { setIntersecting } from '../setup';
import { agentMessage, createFakeAgentClient } from './fake-agent-client';

function setup() {
  const fake = createFakeAgentClient();
  const user = userEvent.setup();
  render(<AskForsyte client={fake.client} onLogout={vi.fn()} />);

  const input = () =>
    screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: 'Message Ask Forsyte',
    });
  const sendButton = () =>
    screen.getByRole<HTMLButtonElement>('button', { name: 'Send message' });
  const conversation = () => screen.getByRole('log', { name: 'Conversation' });
  const messages = () =>
    within(conversation())
      .queryAllByRole('article')
      .map((article) => [
        article.getAttribute('aria-label'),
        article.querySelector('p')?.textContent,
      ]);

  /** Wait until the client has the message, then answer it. */
  async function answer(sequenceId: number, text: string) {
    await waitFor(() => expect(fake.client.sendMessage).toHaveBeenCalled());
    await act(async () => fake.reply(agentMessage(sequenceId, text)));
  }

  return { ...fake, user, input, sendButton, conversation, messages, answer };
}

describe('Ask Forsyte', () => {
  test('Enter sends the message and clears the box', async () => {
    const { user, input, messages, client } = setup();

    await user.type(input(), 'Hello Forsyte{Enter}');

    expect(messages()).toEqual([['You', 'Hello Forsyte']]);
    expect(input().value).toBe('');
    await waitFor(() =>
      expect(client.sendMessage).toHaveBeenCalledWith(
        'forsyte',
        'ses_1',
        'Hello Forsyte'
      )
    );
  });

  test('Shift+Enter adds a new line instead of sending', async () => {
    const { user, input, client } = setup();

    await user.type(input(), 'Line one{Shift>}{Enter}{/Shift}Line two');

    expect(input().value).toBe('Line one\nLine two');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('on touch devices Enter adds a new line and the button sends', async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) => ({ matches: query === '(pointer: coarse)' }) as MediaQueryList
    );
    const { user, input, sendButton, messages } = setup();

    await user.type(input(), 'Line one{Enter}Line two');
    expect(input().value).toBe('Line one\nLine two');

    await user.click(sendButton());
    expect(messages()).toEqual([['You', 'Line one\nLine two']]);

    vi.mocked(window.matchMedia).mockReset();
  });

  test('Send is disabled until there is something to send', async () => {
    const { user, input, sendButton } = setup();

    expect(sendButton().disabled).toBe(true);

    await user.type(input(), '   ');
    expect(sendButton().disabled).toBe(true);

    await user.type(input(), 'Question');
    expect(sendButton().disabled).toBe(false);
  });

  test('while waiting for a reply you can type but not send', async () => {
    const { user, input, sendButton, messages, client, answer } = setup();

    await user.type(input(), 'First{Enter}');
    await user.type(input(), 'Second{Enter}');

    expect(input().value).toBe('Second');
    expect(sendButton().disabled).toBe(true);
    expect(messages()).toEqual([['You', 'First']]);

    await answer(2, 'Reply');
    expect(sendButton().disabled).toBe(false);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('shows Forsyte thinking, then the reply', async () => {
    const { user, input, messages, answer } = setup();

    await user.type(
      input(),
      'Do I have matters in high risk jurisdictions?{Enter}'
    );
    expect(screen.getByText('Forsyte is thinking')).toBeDefined();

    await answer(2, 'Yes, you have 3 matters.');

    expect(screen.queryByText('Forsyte is thinking')).toBeNull();
    expect(messages()).toEqual([
      ['You', 'Do I have matters in high risk jurisdictions?'],
      ['Forsyte', 'Yes, you have 3 matters.'],
    ]);
  });

  test("shows the agent's sources", async () => {
    const { user, input, client, reply } = setup();

    await user.type(input(), 'Outstanding assessments?{Enter}');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () =>
      reply(
        agentMessage(2, 'You can review them below.', {
          content: {
            text: 'You can review them below.',
            resources: [
              { rel: 'mattersWithOutstandingRiskAssessments', href: '/v1/x' },
            ],
          },
        })
      )
    );

    const sources = screen.getByRole('list', { name: 'Sources' });
    expect(
      within(sources).getByText('Matters with outstanding risk assessments')
    ).toBeDefined();
  });

  test('a failed message shows the error and can be retried', async () => {
    const { user, input, messages, client, fail, answer } = setup();

    await user.type(input(), 'What is the weather?{Enter}');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () => fail('Only seeded questions are supported.'));

    const alert = screen.getByRole('alert');
    expect(
      within(alert).getByText('Only seeded questions are supported.')
    ).toBeDefined();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Forsyte is thinking')).toBeDefined();

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(2));
    await answer(2, 'Sunny.');
    expect(messages()).toEqual([
      ['You', 'What is the weather?'],
      ['Forsyte', 'Sunny.'],
    ]);
  });

  test('clicking a suggestion asks it', async () => {
    const { user, messages, client } = setup();
    const suggestions = screen.getByRole('list', {
      name: 'Suggested questions',
    });

    await user.click(
      within(suggestions).getByRole('button', { name: SUGGESTED_QUESTIONS[0] })
    );

    expect(
      screen.queryByRole('list', { name: 'Suggested questions' })
    ).toBeNull();
    expect(messages()).toEqual([['You', SUGGESTED_QUESTIONS[0]]]);
    await waitFor(() =>
      expect(client.sendMessage).toHaveBeenCalledWith(
        'forsyte',
        'ses_1',
        SUGGESTED_QUESTIONS[0]
      )
    );
  });

  test('keeps every suggested question above the input once the chat starts', async () => {
    const { user, answer } = setup();
    const nextBar = () =>
      screen.queryByRole('list', { name: 'Suggested next questions' });
    const chips = () =>
      within(nextBar()!).getAllByRole<HTMLButtonElement>('button');
    const userMessages = () =>
      within(screen.getByRole('log'))
        .getAllByRole('article', { name: 'You' })
        .map((a) => a.textContent);

    // The empty state already lists every question.
    expect(nextBar()).toBeNull();

    await user.click(
      screen.getByRole('button', { name: SUGGESTED_QUESTIONS[0] })
    );

    // Asked questions stay available, so they can be asked again.
    expect(chips().map((chip) => chip.textContent)).toEqual(
      SUGGESTED_QUESTIONS
    );
    // No steering: you can't pick another question mid-reply.
    expect(chips().every((chip) => chip.disabled)).toBe(true);

    await answer(2, 'Yes, you have 3 matters.');
    await user.click(
      within(nextBar()!).getByRole('button', { name: SUGGESTED_QUESTIONS[0] })
    );

    expect(userMessages()).toEqual([
      SUGGESTED_QUESTIONS[0],
      SUGGESTED_QUESTIONS[0],
    ]);
    expect(chips().map((chip) => chip.textContent)).toEqual(
      SUGGESTED_QUESTIONS
    );
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Message Ask Forsyte' })
    );
  });

  test('New chat clears the conversation, but not mid-reply', async () => {
    const { user, input, answer } = setup();
    const newChat = () =>
      screen.getByRole<HTMLButtonElement>('button', { name: 'New chat' });

    await user.type(input(), 'Hello{Enter}');
    expect(newChat().disabled).toBe(true);

    await answer(2, 'Hi');
    await user.click(newChat());

    expect(screen.queryByRole('log')).toBeNull();
    expect(
      screen.getByRole('list', { name: 'Suggested questions' })
    ).toBeDefined();
  });

  test('a scroll-to-latest button appears when you scroll away from the bottom', async () => {
    const { user, input } = setup();
    await user.type(input(), 'Hello{Enter}');

    const scrollButton = () =>
      screen.queryByRole('button', { name: 'Scroll to latest message' });
    expect(scrollButton()).toBeNull();

    act(() => setIntersecting(false));
    const button = scrollButton();
    expect(button).not.toBeNull();

    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    await user.click(button!);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'end',
      behavior: 'smooth',
    });

    act(() => setIntersecting(true));
    expect(scrollButton()).toBeNull();
  });
});
