import type { AgentClient } from './agent-client';
import { ORGANISATION_SLUG } from './config';
import { AGENTS, JOURNEY_STEPS, ORGANISATION_ID } from './fixtures';
import type { Agent, AgentMessage, AgentSession } from './types';

type MockAgentClientOptions = {
  /**
   * How long sendMessage "thinks": a fixed delay, or a function picking one
   * per call. Defaults to 800–1600ms. Session setup isn't delayed, so the
   * first message doesn't take three delays.
   */
  delayMs?: number | (() => number);
};

const randomDelay = () => 800 + Math.random() * 800;

/** Same rule as the API: lower-case, words joined by hyphens, punctuation dropped. */
function toSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * In-memory stand-in for the agent API. It follows the API's rules for the
 * scripted journey, including its error messages and only returning the
 * last agent message of each answer.
 */
export class MockAgentClient implements AgentClient {
  private readonly delay: () => number;
  private readonly messageCounts = new Map<string, number>();

  constructor({ delayMs = randomDelay }: MockAgentClientOptions = {}) {
    this.delay = typeof delayMs === 'number' ? () => delayMs : delayMs;
  }

  async listAgents(org: string): Promise<Agent[]> {
    const isKnownOrg = org === ORGANISATION_SLUG || org === ORGANISATION_ID;
    return isKnownOrg ? [...AGENTS] : [];
  }

  async createSession(_org: string, agentId: string): Promise<AgentSession> {
    if (!AGENTS.some((agent) => agent.id === agentId)) {
      throw new Error('Agent not found');
    }
    const session: AgentSession = {
      id: `ses_${crypto.randomUUID()}`,
      agentId,
      organisationId: ORGANISATION_ID,
      createdAt: new Date().toISOString(),
    };
    this.messageCounts.set(session.id, 0);
    return session;
  }

  async sendMessage(
    _org: string,
    sessionId: string,
    text: string
  ): Promise<AgentMessage> {
    await this.wait();

    const existingCount = this.messageCounts.get(sessionId);
    if (existingCount === undefined) {
      throw new Error('Session not found');
    }
    if (!text.trim()) {
      throw new Error('Message content must include a non-empty text field.');
    }

    const slug = toSlug(text);
    const step = JOURNEY_STEPS.find((s) => toSlug(s.question) === slug);
    if (!step) {
      throw new Error(
        `This mock conversation only supports specific seeded questions. Received slug: "${slug || '(empty)'}".`
      );
    }

    // One message for the user, then one per answer part.
    const lastSequenceId = existingCount + 1 + step.answers.length;
    this.messageCounts.set(sessionId, lastSequenceId);

    return {
      id: `msg_${crypto.randomUUID()}`,
      sessionId,
      role: 'agent',
      sequenceId: lastSequenceId,
      content: step.answers[step.answers.length - 1],
      createdAt: new Date().toISOString(),
    };
  }

  private wait() {
    return new Promise((resolve) => setTimeout(resolve, this.delay()));
  }
}
