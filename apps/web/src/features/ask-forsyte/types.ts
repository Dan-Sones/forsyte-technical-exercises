// Shapes of the API's JSON responses (see apps/api agent DTOs). Dates arrive
// as ISO strings, not Date objects.

export type AgentMessageRole = 'user' | 'agent';

export type AgentMessageResource = { rel: string; href: string };

export type AgentMessageContent = {
  text: string;
  resources?: AgentMessageResource[];
  meta?: { model: string; finishReason: 'stop' | 'length' };
};

export type AgentMessage = {
  id: string;
  sessionId: string;
  role: AgentMessageRole;
  sequenceId: number;
  content: AgentMessageContent | null;
  createdAt: string;
};

export type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentSession = {
  id: string;
  agentId: string;
  organisationId: string;
  createdAt: string;
};
