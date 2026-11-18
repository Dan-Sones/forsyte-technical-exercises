import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useAgentChat } from '@/features/ask-forsyte/use-agent-chat';
import { ORGANISATION_SLUG } from '@/features/ask-forsyte/fixtures';
import { agentMessage, createFakeAgentClient } from './fake-agent-client';

function setup(options?: Parameters<typeof useAgentChat>[1]) {
  const fake = createFakeAgentClient();
  const hook = renderHook(() => useAgentChat(fake.client, options));
  return { ...fake, hook, chat: () => hook.result.current };
}

const texts = (messages: { content: { text: string } | null }[]) =>
  messages.map((m) => m.content?.text);

describe('useAgentChat', () => {
  test('shows the user message straight away and the reply once it arrives', async () => {
    const { chat, client, reply } = setup();

    act(() => {
      chat().send('Do I have matters in high risk jurisdictions?');
    });

    expect(chat().isPending).toBe(true);
    expect(chat().messages).toMatchObject([{ role: 'user', sequenceId: 1 }]);

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () => reply(agentMessage(2, 'Yes, you have 3 matters')));

    expect(chat().isPending).toBe(false);
    expect(texts(chat().messages)).toEqual([
      'Do I have matters in high risk jurisdictions?',
      'Yes, you have 3 matters',
    ]);
  });

  test('creates the session on the first send and reuses it afterwards', async () => {
    const { chat, client, reply } = setup();

    act(() => {
      chat().send('First');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));
    await act(async () => reply(agentMessage(2, 'One')));

    act(() => {
      chat().send('Second');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(2));

    expect(client.createSession).toHaveBeenCalledTimes(1);
    expect(client.createSession).toHaveBeenCalledWith(
      ORGANISATION_SLUG,
      'agt_wired_compliance'
    );
    expect(client.sendMessage).toHaveBeenLastCalledWith(
      ORGANISATION_SLUG,
      'ses_1',
      'Second'
    );
  });

  test('numbers the next user message after the last reply', async () => {
    const { chat, client, reply } = setup();

    act(() => {
      chat().send('Show the flags');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    // A two-part answer: the API skips sequenceId 2 and returns 3.
    await act(async () => reply(agentMessage(3, 'Overall...')));

    act(() => {
      chat().send('Next question');
    });

    expect(chat().messages.at(-1)).toMatchObject({
      role: 'user',
      sequenceId: 4,
    });
  });

  test('ignores blank text and sends made while a reply is pending', async () => {
    const { chat, client } = setup();

    act(() => {
      expect(chat().send('   ')).toBe(false);
    });
    expect(chat().messages).toHaveLength(0);

    act(() => {
      expect(chat().send('First')).toBe(true);
    });
    act(() => {
      expect(chat().send('Second')).toBe(false);
    });

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));
    expect(texts(chat().messages)).toEqual(['First']);
  });

  test('keeps messages in sequenceId order, not arrival order', () => {
    const { chat } = setup({
      initialMessages: [
        agentMessage(2, 'Second'),
        agentMessage(3, 'Third', { role: 'user' }),
        agentMessage(1, 'First', { role: 'user' }),
      ],
    });

    expect(texts(chat().messages)).toEqual(['First', 'Second', 'Third']);
  });

  test('reports a failed send and keeps the user message', async () => {
    const { chat, client, fail } = setup();

    act(() => {
      chat().send('What is the weather?');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () => fail('Only seeded questions are supported.'));

    expect(chat().isPending).toBe(false);
    expect(chat().error).toEqual({
      message: 'Only seeded questions are supported.',
      failedMessageId: chat().messages[0].id,
    });
    expect(texts(chat().messages)).toEqual(['What is the weather?']);
  });

  test('retry resends the failed message without duplicating it', async () => {
    const { chat, client, fail, reply } = setup();

    act(() => {
      chat().send('Hello');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));
    await act(async () => fail('Network error'));

    act(() => chat().retry());

    expect(chat().error).toBeNull();
    expect(chat().isPending).toBe(true);
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(2));
    expect(client.sendMessage).toHaveBeenLastCalledWith(
      ORGANISATION_SLUG,
      'ses_1',
      'Hello'
    );

    await act(async () => reply(agentMessage(2, 'Hi')));
    expect(texts(chat().messages)).toEqual(['Hello', 'Hi']);
  });

  test('retry starts the session again if creating it failed', async () => {
    const { chat, client, reply } = setup();
    client.createSession.mockRejectedValueOnce(new Error('Agent not found'));

    act(() => {
      chat().send('Hello');
    });
    await waitFor(() => expect(chat().error?.message).toBe('Agent not found'));

    act(() => chat().retry());
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));
    await act(async () => reply(agentMessage(2, 'Hi')));

    expect(client.createSession).toHaveBeenCalledTimes(2);
    expect(chat().error).toBeNull();
  });

  test('sending a new message replaces the failed one', async () => {
    const { chat, client, fail } = setup();

    act(() => {
      chat().send('Unsupported question');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () => fail('Not supported'));

    act(() => {
      chat().send('Supported question');
    });

    expect(chat().error).toBeNull();
    expect(chat().messages).toMatchObject([
      { sequenceId: 1, content: { text: 'Supported question' } },
    ]);
  });

  test('fails clearly when the organisation has no wired agent', async () => {
    const { chat, client } = setup();
    client.listAgents.mockResolvedValueOnce([]);

    act(() => {
      chat().send('Hello');
    });

    await waitFor(() =>
      expect(chat().error?.message).toBe(
        'Ask Forsyte is not available for this organisation.'
      )
    );
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('reset clears the conversation and starts a new session next time', async () => {
    const { chat, client, reply } = setup();

    act(() => {
      chat().send('Hello');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    await act(async () => reply(agentMessage(2, 'Hi')));

    act(() => chat().reset());
    expect(chat().messages).toHaveLength(0);

    act(() => {
      chat().send('Hello again');
    });
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(2));
    expect(client.createSession).toHaveBeenCalledTimes(2);
    expect(client.sendMessage).toHaveBeenLastCalledWith(
      ORGANISATION_SLUG,
      'ses_2',
      'Hello again'
    );
  });
});
