import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

describe('request panel (desktop)', () => {
  it('shows Mark contacted and Close as buttons beside Call and WhatsApp', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/inquiries');
    const table = await screen.findByRole('table');
    await user.click(within(table).getAllByRole('row')[1]!);
    // The sidebar is also an <aside>; the request panel is the one with the request actions.
    const panel = screen
      .getAllByRole('complementary')
      .find((a) => within(a).queryByRole('button', { name: 'Close…' }))!;
    const looks = (el: HTMLElement) => el.className;
    const call = within(panel).getByRole('link', { name: 'Call' });
    for (const name of ['WhatsApp'])
      expect(looks(within(panel).getByRole('link', { name }))).toBe(looks(call));
    for (const name of ['Mark contacted', 'Close…'])
      expect(looks(within(panel).getByRole('button', { name }))).toContain(looks(call));

    await user.click(within(panel).getByRole('button', { name: 'Mark contacted' }));
    // It moves to Contacted, out of the New list.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Mark contacted' })).not.toBeInTheDocument(),
    );
  });
});
