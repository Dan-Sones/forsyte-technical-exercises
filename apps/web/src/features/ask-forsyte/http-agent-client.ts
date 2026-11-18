import { API_BASE_URL } from '@/lib/api-config';
import type { AgentClient } from './agent-client';
import type { Agent, AgentMessage, AgentSession } from './types';

export type AgentApiErrorKind =
  /** No token, or the API rejected it (401). */
  | 'unauthorized'
  /** 404: an unknown organisation, agent or session. */
  | 'not-found'
  /** 400: the API refused the input, e.g. a question it has no answer for. */
  | 'bad-request'
  /** The request never got a response. */
  | 'network'
  /** Any other status, or a body that isn't the JSON we expect. */
  | 'unexpected';

/**
 * What every HttpAgentClient method rejects with. `message` is safe to show
 * to the user: the API's own text for 400s and 404s, ours for the rest.
 */
export class AgentApiError extends Error {
  constructor(
    readonly kind: AgentApiErrorKind,
    message: string,
    /** The HTTP status, when there was a response. */
    readonly status?: number
  ) {
    super(message);
    this.name = 'AgentApiError';
  }
}

const MESSAGES = {
  unauthorized: 'Your session has expired. Sign in again.',
  network: "Couldn't reach the server. Try again.",
  generic: 'Something went wrong. Try again.',
};

type HttpAgentClientOptions = {
  /** Read before every request, so the client never holds a stale token. */
  getAccessToken: () => string | null;
  /**
   * Called when the API answers 401, with the token that request sent. The
   * request still rejects afterwards.
   */
  onUnauthorized: (token: string) => void;
  baseUrl?: string;
};

/** Talks to the NestJS agent endpoints with fetch. */
export class HttpAgentClient implements AgentClient {
  private readonly getAccessToken: () => string | null;
  private readonly onUnauthorized: (token: string) => void;
  private readonly baseUrl: string;

  constructor({
    getAccessToken,
    onUnauthorized,
    baseUrl = API_BASE_URL,
  }: HttpAgentClientOptions) {
    this.getAccessToken = getAccessToken;
    this.onUnauthorized = onUnauthorized;
    this.baseUrl = baseUrl;
  }

  async listAgents(org: string): Promise<Agent[]> {
    // TODO(zod): parse with z.array(AgentSchema) instead of trusting the cast.
    return this.request<Agent[]>('GET', `/${segment(org)}/agents`);
  }

  async createSession(org: string, agentId: string): Promise<AgentSession> {
    // The API's AgentSessionFormDto has no fields, so the body is empty.
    // TODO(zod): parse with AgentSessionSchema instead of trusting the cast.
    return this.request<AgentSession>(
      'POST',
      `/${segment(org)}/agents/${segment(agentId)}/sessions`,
      {}
    );
  }

  async sendMessage(
    org: string,
    sessionId: string,
    text: string
  ): Promise<AgentMessage> {
    // TODO(zod): parse with AgentMessageSchema instead of trusting the cast.
    return this.request<AgentMessage>(
      'POST',
      `/${segment(org)}/agents/sessions/${segment(sessionId)}/messages`,
      { role: 'user', content: { text } }
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object
  ): Promise<T> {
    // Signed out already, so there is nothing to expire.
    const token = this.getAccessToken();
    if (token === null) {
      throw new AgentApiError('unauthorized', MESSAGES.unauthorized);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AgentApiError('network', MESSAGES.network);
    }

    if (response.status === 401) {
      // Hand over the token this request used, not the current one: if the
      // user signed in again meanwhile, auth knows to ignore this.
      this.onUnauthorized(token);
      throw new AgentApiError('unauthorized', MESSAGES.unauthorized, 401);
    }
    if (!response.ok) throw await toError(response);

    try {
      return (await response.json()) as T;
    } catch {
      throw new AgentApiError('unexpected', MESSAGES.generic, response.status);
    }
  }
}

const segment = encodeURIComponent;

/** Maps a non-2xx, non-401 response to an AgentApiError. */
async function toError(response: Response): Promise<AgentApiError> {
  const { status } = response;
  const kind: AgentApiErrorKind =
    status === 400
      ? 'bad-request'
      : status === 404
        ? 'not-found'
        : 'unexpected';

  // Only 400 and 404 carry text written for the user. Anything else (a 500's
  // "Internal server error", say) gets ours.
  const serverMessage =
    kind === 'unexpected' ? null : readNestMessage(await readJson(response));
  return new AgentApiError(kind, serverMessage ?? MESSAGES.generic, status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Nest errors look like `{ statusCode, message, error }`. `message` is a
 * string, or a list of strings when the ValidationPipe rejects a body.
 */
function readNestMessage(body: unknown): string | null {
  // TODO(zod): parse with NestErrorSchema instead of checking by hand.
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return null;
  }
  const { message } = body;
  if (typeof message === 'string' && message !== '') return message;
  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((m) => typeof m === 'string')
  ) {
    return message.join('; ');
  }
  return null;
}
