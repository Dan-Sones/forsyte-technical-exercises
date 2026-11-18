import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LoginPage from '@/app/login/page';
import Page from '@/app/page';
import { AGENTS } from '@/features/ask-forsyte/fixtures';
import { AuthProvider } from '@/features/auth/auth-context';
import {
  mockAgentApi,
  type RecordedRequest,
  type Reply,
} from './ask-forsyte/api';
import { expiredToken, validToken } from './auth/fake-jwt';
import { router } from './router-mock';

const STORAGE_KEY = 'ask-forsyte-access-token';

function renderHome() {
  return render(
    <AuthProvider>
      <Page />
    </AuthProvider>
  );
}

const QUESTION = 'Do I have matters in high risk jurisdictions?';

/** The API up to the message, which `sendMessage` answers. */
function agentApi(sendMessage: Reply) {
  return ({ method, path }: RecordedRequest): Reply => {
    if (method === 'GET' && path === '/forsyte/agents') {
      return { status: 200, json: AGENTS };
    }
    if (method === 'POST' && path.endsWith('/sessions')) {
      return {
        status: 201,
        json: {
          id: 'ses_1',
          agentId: 'agt_wired_compliance',
          organisationId: 'org_forsyte',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      };
    }
    return sendMessage;
  };
}

async function ask(question: string) {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole('textbox', { name: 'Message Ask Forsyte' }),
    `${question}{Enter}`
  );
}

describe('Home page', () => {
  afterEach(() => vi.unstubAllEnvs());

  test('a signed-in user sees the Ask Forsyte assistant', () => {
    sessionStorage.setItem(STORAGE_KEY, validToken());
    renderHome();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ask Forsyte' })
    ).toBeDefined();
    expect(
      screen.getByRole('textbox', { name: 'Message Ask Forsyte' })
    ).toBeDefined();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('a signed-out user is sent to the login page', async () => {
    renderHome();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(
      screen.queryByRole('textbox', { name: 'Message Ask Forsyte' })
    ).toBeNull();
  });

  test('a user whose stored session has expired is sent to the login page', async () => {
    sessionStorage.setItem(STORAGE_KEY, expiredToken());
    renderHome();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  test('Log out ends the session and returns to the login page', async () => {
    sessionStorage.setItem(STORAGE_KEY, validToken());
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      screen.queryByRole('textbox', { name: 'Message Ask Forsyte' })
    ).toBeNull();
  });

  test('questions go to the API with the session token', async () => {
    const token = validToken();
    sessionStorage.setItem(STORAGE_KEY, token);
    const api = mockAgentApi(
      agentApi({
        status: 201,
        json: {
          id: 'msg_2',
          sessionId: 'ses_1',
          role: 'agent',
          sequenceId: 2,
          content: { text: 'You have 3 matters.' },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      })
    );
    renderHome();

    await ask(QUESTION);

    expect(await screen.findByText('You have 3 matters.')).toBeDefined();
    expect(api.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /forsyte/agents',
      'POST /forsyte/agents/agt_wired_compliance/sessions',
      'POST /forsyte/agents/sessions/ses_1/messages',
    ]);
    expect(
      api.requests.every((r) => r.authorization === `Bearer ${token}`)
    ).toBe(true);
  });

  test('NEXT_PUBLIC_AGENT_CLIENT=mock answers from the stub, not the API', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_CLIENT', 'mock');
    sessionStorage.setItem(STORAGE_KEY, validToken());
    const api = mockAgentApi({ status: 500, json: {} });
    renderHome();

    await ask(QUESTION);

    // The stub's answer is markdown, so its link proves where it came from.
    expect(
      await screen.findByRole(
        'link',
        { name: 'FATF high-risk jurisdictions list' },
        { timeout: 3000 }
      )
    ).toBeDefined();
    expect(api.requests).toEqual([]);
  });

  test('a 401 mid-chat signs out and explains on the login page', async () => {
    sessionStorage.setItem(STORAGE_KEY, validToken());
    mockAgentApi(agentApi({ status: 401, json: { message: 'Unauthorized' } }));
    // The router is mocked, so render the login route alongside: it shows
    // once the session ends, as it would after the redirect.
    render(
      <AuthProvider>
        <Page />
        <LoginPage />
      </AuthProvider>
    );

    await ask(QUESTION);

    await waitFor(() =>
      expect(router.replace).toHaveBeenLastCalledWith('/login')
    );
    expect((await screen.findByRole('status')).textContent).toBe(
      'Your session has expired. Sign in again to continue.'
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      screen.queryByRole('textbox', { name: 'Message Ask Forsyte' })
    ).toBeNull();
  });
});
