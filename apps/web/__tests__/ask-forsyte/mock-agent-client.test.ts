import { beforeEach, describe, expect, test } from 'vitest';
import { MockAgentClient } from '@/features/ask-forsyte/mock-agent-client';
import {
  ORGANISATION_SLUG,
  WIRED_AGENT_SLUG,
} from '@/features/ask-forsyte/fixtures';

const FIRST_QUESTION = 'Do I have matters in high risk jurisdictions?';
const SECOND_QUESTION = 'How many of those have outstanding risk assessments?';
const TWO_PART_QUESTION =
  'Show the risk assessment flags for the Beekeeper employment contract';

describe('MockAgentClient', () => {
  let client: MockAgentClient;
  let agentId: string;
  let sessionId: string;

  beforeEach(async () => {
    client = new MockAgentClient({ delayMs: 0 });
    const agents = await client.listAgents(ORGANISATION_SLUG);
    agentId = agents.find((a) => a.slug === WIRED_AGENT_SLUG)!.id;
    const session = await client.createSession(ORGANISATION_SLUG, agentId);
    sessionId = session.id;
  });

  test('answers a supported question with an agent message', async () => {
    const reply = await client.sendMessage(
      ORGANISATION_SLUG,
      sessionId,
      FIRST_QUESTION
    );

    expect(reply).toMatchObject({
      sessionId,
      role: 'agent',
      sequenceId: 2,
      content: { meta: { finishReason: 'stop' } },
    });
    expect(reply.content?.text).toMatch(/^Yes, you have 3 matters/);
  });

  test('matches questions regardless of case and punctuation', async () => {
    const reply = await client.sendMessage(
      ORGANISATION_SLUG,
      sessionId,
      '  do i have MATTERS in high-risk jurisdictions  '
    );

    expect(reply.role).toBe('agent');
  });

  test('counts every message in the session, including multi-part answers', async () => {
    await client.sendMessage(ORGANISATION_SLUG, sessionId, FIRST_QUESTION);
    await client.sendMessage(ORGANISATION_SLUG, sessionId, SECOND_QUESTION);
    const reply = await client.sendMessage(
      ORGANISATION_SLUG,
      sessionId,
      TWO_PART_QUESTION
    );

    // user 5, agent 6 (dropped, like the real API), agent 7
    expect(reply.sequenceId).toBe(7);
    expect(reply.content?.text).toMatch(/^Overall, the Beekeeper/);
    expect(reply.content?.resources).toEqual([
      {
        rel: 'riskAssessmentDetails',
        href: '/v1/risk-assessments/{beekeeperRiskId}',
      },
    ]);
  });

  test('rejects questions outside the mock journey, like the backend', async () => {
    await expect(
      client.sendMessage(ORGANISATION_SLUG, sessionId, 'What is the weather?')
    ).rejects.toThrow(
      'This mock conversation only supports specific seeded questions.'
    );
  });

  test('rejects blank text', async () => {
    await expect(
      client.sendMessage(ORGANISATION_SLUG, sessionId, '   ')
    ).rejects.toThrow('Message content must include a non-empty text field.');
  });

  test('rejects an unknown session', async () => {
    await expect(
      client.sendMessage(ORGANISATION_SLUG, 'ses_missing', FIRST_QUESTION)
    ).rejects.toThrow('Session not found');
  });

  test('lists no agents for an unknown organisation', async () => {
    await expect(client.listAgents('unknown-org')).resolves.toEqual([]);
  });

  test('rejects an unknown agent', async () => {
    await expect(
      client.createSession(ORGANISATION_SLUG, 'agt_missing')
    ).rejects.toThrow('Agent not found');
  });

  test('keeps sessions independent', async () => {
    await client.sendMessage(ORGANISATION_SLUG, sessionId, FIRST_QUESTION);
    const other = await client.createSession(ORGANISATION_SLUG, agentId);

    const reply = await client.sendMessage(
      ORGANISATION_SLUG,
      other.id,
      FIRST_QUESTION
    );

    expect(reply.sequenceId).toBe(2);
  });
});
