import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import LoginPage from '@/app/login/page';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { router } from '../router-mock';
import {
  mockLoginApi,
  mockLoginHangs,
  mockLoginNetworkError,
  mockLoginResponse,
  SEEDED_USER,
} from './api';
import { validToken } from './fake-jwt';

const STORAGE_KEY = 'ask-forsyte-access-token';

/** Stands in for an API client that got a 401 for this token. */
function ExpireButton({ token }: { token: string }) {
  const { expireSession } = useAuth();
  return <button onClick={() => expireSession(token)}>Expire</button>;
}

function setup() {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );

  const email = () => screen.getByLabelText<HTMLInputElement>('Email');
  const password = () => screen.getByLabelText<HTMLInputElement>('Password');

  async function signIn(
    credentials: { email: string; password: string } = SEEDED_USER
  ) {
    await user.type(email(), credentials.email);
    await user.type(password(), credentials.password);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
  }

  return { user, email, password, signIn };
}

describe('Login page', () => {
  test('signing in stores the session and goes to the chat', async () => {
    const api = mockLoginApi();
    const { signIn } = setup();

    await signIn();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(api.requests).toEqual([SEEDED_USER]);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(api.token);
    // The form goes away once signed in.
    expect(screen.queryByRole('form', { name: 'Sign in' })).toBeNull();
  });

  test('pressing Enter in the password field submits', async () => {
    mockLoginApi();
    const { user, email, password } = setup();

    await user.type(email(), SEEDED_USER.email);
    await user.type(password(), `${SEEDED_USER.password}{Enter}`);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  test('shows the button as busy while signing in', async () => {
    mockLoginHangs();
    const { signIn } = setup();

    await signIn();

    const button = await screen.findByRole('button', { name: 'Signing in' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('wrong credentials mark both fields and explain under the password', async () => {
    mockLoginApi();
    const { signIn, email, password } = setup();

    await signIn({ email: SEEDED_USER.email, password: 'wrong-password' });

    const message = await screen.findByRole('alert');
    expect(message.textContent).toBe('Incorrect email or password.');
    expect(email().getAttribute('aria-invalid')).toBe('true');
    expect(password().getAttribute('aria-invalid')).toBe('true');
    expect(password().getAttribute('aria-describedby')).toBe(message.id);
    expect(router.replace).not.toHaveBeenCalled();
    // The button is usable again.
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined();
  });

  test('an unreachable server gets its own message, not a field error', async () => {
    mockLoginNetworkError();
    const { signIn, password } = setup();

    await signIn();

    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't reach the server. Try again."
    );
    expect(password().getAttribute('aria-invalid')).toBeNull();
  });

  test('a server error asks the user to try again', async () => {
    mockLoginResponse(500, { message: 'Internal server error' });
    const { signIn } = setup();

    await signIn();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Try again.'
    );
  });

  test('trying again after an error clears it and can succeed', async () => {
    mockLoginApi();
    const { user, signIn, password } = setup();

    await signIn({ email: SEEDED_USER.email, password: 'wrong-password' });
    await screen.findByRole('alert');

    await user.clear(password());
    await user.type(password(), `${SEEDED_USER.password}{Enter}`);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('explains when the session expired', async () => {
    const token = validToken();
    sessionStorage.setItem(STORAGE_KEY, token);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ExpireButton token={token} />
        <LoginPage />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Expire' }));

    expect((await screen.findByRole('status')).textContent).toBe(
      'Your session has expired. Sign in again to continue.'
    );
  });

  test('says nothing about expiry on a normal visit', () => {
    setup();

    expect(screen.queryByRole('status')).toBeNull();
  });

  test('an already signed-in user is sent to the chat', async () => {
    sessionStorage.setItem(STORAGE_KEY, validToken());
    setup();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('form', { name: 'Sign in' })).toBeNull();
  });
});
