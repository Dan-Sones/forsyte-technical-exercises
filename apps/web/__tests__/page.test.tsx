import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import Page from '@/app/page';
import { AuthProvider } from '@/features/auth/auth-context';
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

describe('Home page', () => {
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
});
