import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '@/app/page';

test('the home page is the Ask Forsyte assistant', () => {
  render(<Page />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Ask Forsyte' })
  ).toBeDefined();
  expect(
    screen.getByRole('textbox', { name: 'Message Ask Forsyte' })
  ).toBeDefined();
});
