import { describe, expect, test, vi } from 'vitest';
import {
  AgentApiError,
  HttpAgentClient,
} from '@/features/ask-forsyte/http-agent-client';
import { AGENTS } from '@/features/ask-forsyte/fixtures';
import type { AgentMessage, AgentSession } from '@/features/ask-forsyte/types';
import { mockAgentApi } from './api';

const ORG = 'forsyte';
const TOKEN = 'token-a';

const SESSION: AgentSession = {
  id: 'ses_1',
  agentId: 'agt_wired_compliance',
  organisationId: 'org_forsyte',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const REPLY: AgentMessage = {
  id: 'msg_2',
  sessionId: 'ses_1',
  role: 'agent',
  sequenceId: 2,
  content: { text: 'Three matters.' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

function setup(token: () => string | null = () => TOKEN) {
  const onUnauthorized = vi.fn();
  const client = new HttpAgentClient({
    getAccessToken: token,
    onUnauthorized,
  });
  return { client, onUnauthorized };
}

async function apiError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(AgentApiError);
  return error as AgentApiError;
}

describe('HttpAgentClient', () => {
  describe('requests', () => {
    test('listAgents gets the organisation’s agents', async () => {
      const api = mockAgentApi({ status: 200, json: AGENTS });
      const { client } = setup();

      const agents = await client.listAgents(ORG);

      expect(agents).toEqual(AGENTS);
      expect(api.requests).toEqual([
        {
          method: 'GET',
          path: '/forsyte/agents',
          authorization: `Bearer ${TOKEN}`,
          accept: 'application/json',
          contentType: null,
          body: undefined,
        },
      ]);
    });

    test('createSession posts an empty form for the agent', async () => {
      const api = mockAgentApi({ status: 201, json: SESSION });
      const { client } = setup();

      const session = await client.createSession(ORG, 'agt_wired_compliance');

      expect(session).toEqual(SESSION);
      expect(api.requests).toEqual([
        {
          method: 'POST',
          path: '/forsyte/agents/agt_wired_compliance/sessions',
          authorization: `Bearer ${TOKEN}`,
          accept: 'application/json',
          contentType: 'application/json',
          body: {},
        },
      ]);
    });

    test('sendMessage posts the text as a user message', async () => {
      const api = mockAgentApi({ status: 201, json: REPLY });
      const { client } = setup();

      const reply = await client.sendMessage(ORG, 'ses_1', 'Any matters?');

      expect(reply).toEqual(REPLY);
      expect(api.requests).toEqual([
        {
          method: 'POST',
          path: '/forsyte/agents/sessions/ses_1/messages',
          authorization: `Bearer ${TOKEN}`,
          accept: 'application/json',
          contentType: 'application/json',
          body: { role: 'user', content: { text: 'Any matters?' } },
        },
      ]);
    });

    test('encodes path segments', async () => {
      const api = mockAgentApi({ status: 201, json: REPLY });
      const { client } = setup();

      await client.sendMessage('a/b', 'ses 1?', 'Hi');

      expect(api.requests[0].path).toBe(
        '/a%2Fb/agents/sessions/ses%201%3F/messages'
      );
    });

    test('reads the token afresh for every request', async () => {
      const api = mockAgentApi({ status: 200, json: [] });
      let token = 'token-a';
      const { client } = setup(() => token);

      await client.listAgents(ORG);
      token = 'token-b';
      await client.listAgents(ORG);

      expect(api.requests.map((r) => r.authorization)).toEqual([
        'Bearer token-a',
        'Bearer token-b',
      ]);
    });
  });

  describe('auth', () => {
    test('with no token it rejects without a request or an expiry', async () => {
      const api = mockAgentApi({ status: 200, json: [] });
      const { client, onUnauthorized } = setup(() => null);

      const error = await apiError(client.listAgents(ORG));

      expect(error.kind).toBe('unauthorized');
      expect(api.requests).toEqual([]);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    test('a 401 reports the token it sent, then rejects', async () => {
      let token = 'token-a';
      // The user signs in again while the doomed request is in flight.
      mockAgentApi(
        { status: 401, json: { message: 'Unauthorized', statusCode: 401 } },
        () => {
          token = 'token-b';
        }
      );
      const { client, onUnauthorized } = setup(() => token);

      const error = await apiError(client.sendMessage(ORG, 'ses_1', 'Hi'));

      expect(error).toMatchObject({ kind: 'unauthorized', status: 401 });
      expect(error.message).toBe('Your session has expired. Sign in again.');
      expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith('token-a');
    });
  });

  describe('errors', () => {
    const GENERIC = 'Something went wrong. Try again.';

    test.each([
      [
        400,
        {
          message: 'Message content must include a non-empty text field.',
          error: 'Bad Request',
          statusCode: 400,
        },
        'bad-request',
        'Message content must include a non-empty text field.',
      ],
      [
        400,
        { message: ['role must be a valid enum value', 'content is bad'] },
        'bad-request',
        'role must be a valid enum value; content is bad',
      ],
      [400, {}, 'bad-request', GENERIC],
      [
        404,
        { message: 'Session not found', statusCode: 404 },
        'not-found',
        'Session not found',
      ],
      [404, { message: 42 }, 'not-found', GENERIC],
      [403, { message: 'Forbidden' }, 'unexpected', GENERIC],
      [500, { message: 'Internal server error' }, 'unexpected', GENERIC],
    ])(
      'a %i with %j rejects as %s: "%s"',
      async (status, json, kind, message) => {
        mockAgentApi({ status, json });
        const { client, onUnauthorized } = setup();

        const error = await apiError(client.listAgents(ORG));

        expect(error).toMatchObject({ kind, status, message });
        expect(onUnauthorized).not.toHaveBeenCalled();
      }
    );

    test('an error response that is not JSON falls back to generic text', async () => {
      mockAgentApi({ status: 404, text: '<html>Not Found</html>' });
      const { client } = setup();

      const error = await apiError(client.listAgents(ORG));

      expect(error).toMatchObject({ kind: 'not-found', message: GENERIC });
    });

    test('a success that is not JSON is unexpected', async () => {
      mockAgentApi({ status: 200, text: 'not json' });
      const { client } = setup();

      const error = await apiError(client.listAgents(ORG));

      expect(error).toMatchObject({
        kind: 'unexpected',
        status: 200,
        message: GENERIC,
      });
    });

    test('an unreachable API is a network error', async () => {
      mockAgentApi('network-error');
      const { client } = setup();

      const error = await apiError(client.listAgents(ORG));

      expect(error).toMatchObject({
        kind: 'network',
        status: undefined,
        message: "Couldn't reach the server. Try again.",
      });
    });
  });
});
