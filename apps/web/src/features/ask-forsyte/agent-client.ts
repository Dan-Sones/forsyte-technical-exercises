import type { Agent, AgentMessage, AgentSession } from './types';

/**
 * The seam between the chat UI and the agent API. Exercise 1 uses
 * MockAgentClient; exercise 2 adds HttpAgentClient.
 *
 * TODO: to make requests cancellable, give each method an optional
 * `{ signal?: AbortSignal }` and pass it through to fetch.
 */
export interface AgentClient {
  listAgents(org: string): Promise<Agent[]>;
  createSession(org: string, agentId: string): Promise<AgentSession>;
  /**
   * Resolves with the last agent message only, like the API. The user's
   * message and any earlier parts of a multi-part answer are not returned.
   */
  sendMessage(
    org: string,
    sessionId: string,
    text: string
  ): Promise<AgentMessage>;
}
