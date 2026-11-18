import type { AgentClient } from './agent-client';
import {
  HttpAgentClient,
  type HttpAgentClientOptions,
} from './http-agent-client';
import { MockAgentClient } from './mock-agent-client';

/**
 * The real API by default. With NEXT_PUBLIC_AGENT_CLIENT=mock, the chat uses
 * the in-memory stub instead, whose answers include markdown. Sign-in still
 * goes through the API.
 */
export function createAgentClient(
  options: HttpAgentClientOptions
): AgentClient {
  return process.env.NEXT_PUBLIC_AGENT_CLIENT === 'mock'
    ? new MockAgentClient()
    : new HttpAgentClient(options);
}
