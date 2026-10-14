import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

describe('app', () => {
  it('redirects to sign in and lands on the owner dashboard', async () => {
    const { user, router } = renderApp('/settlement');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Phone or email'), '+91 98220 41736');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Settle up · 1–14 Oct 2026')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settlement');
  });

  it('shows clinic tiles and attention items to an owner', async () => {
    await signInAs('owner');
    renderApp('/');
    expect(await screen.findByText('₹11,400')).toBeInTheDocument();
    const attention = await screen.findByRole('region', { name: 'Needs attention' });
    expect(await within(attention).findByText('Caretaker salary not logged')).toBeInTheDocument();
    expect(await within(attention).findByText('Consumables at 107% of budget')).toBeInTheDocument();
  });

  it('logs a quick-add expense and shows it in transactions', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await screen.findByText('Kinesio tape, 6 rolls');
    await user.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);

    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    await user.click(within(sheet).getByRole('button', { name: /^Save/ }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Enter an amount.');

    await user.type(within(sheet).getByLabelText('Amount'), '1450');
    await user.click(await within(sheet).findByRole('button', { name: 'Utilities' }));
    await user.click(within(sheet).getByRole('button', { name: 'Description, receipt photo' }));
    await user.type(within(sheet).getByLabelText('Description (optional)'), 'Water cans');
    await user.click(within(sheet).getByRole('button', { name: 'Save ₹1,450 · Utilities' }));

    expect(await screen.findByText(/Saved ₹1,450 · Utilities · \d+s/)).toBeInTheDocument();
    expect(await screen.findByText('Water cans')).toBeInTheDocument();
  });

  it('opens a prefilled entry from recurring and marks it logged', async () => {
    await signInAs('owner');
    const { user } = renderApp('/recurring');
    await screen.findByText('Caretaker salary');
    await user.click(screen.getAllByRole('button', { name: 'Log now' })[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    expect(within(sheet).getByLabelText('Amount')).toHaveValue('8000');
    await user.click(await within(sheet).findByRole('button', { name: 'Save ₹8,000 · Salaries' }));
    expect(await screen.findByText('4/7')).toBeInTheDocument();
  });

  it('limits a therapist to own entries and hides owner screens', async () => {
    await signInAs('therapist');
    const { router } = renderApp('/');
    expect(await screen.findByText('Your latest entries')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Settlement/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText('Knee rehab session')).not.toBeInTheDocument();

    await act(() => router.navigate('/settlement'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByText('Your latest entries')).toBeInTheDocument();
  });

  it('cycles a role permission but never reduces Owner', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/roles');
    const cell = await screen.findByRole('button', { name: 'Edit any entry, Therapist: None' });
    await user.click(cell);
    expect(
      await screen.findByRole('button', { name: 'Edit any entry, Therapist: All' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit any entry, Owner: All' }));
    expect(screen.getByRole('button', { name: 'Edit any entry, Owner: All' })).toBeInTheDocument();
  });
});

describe('auth & RBAC (L2 shapes, mock mode)', () => {
  it('shows sign-in errors from the auth layer', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter your phone or email and password.',
    );
  });

  it('gives the CA read access without an add button', async () => {
    await signInAs('ca');
    renderApp('/');
    expect(await screen.findByText('₹11,400')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add entry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log now' })).not.toBeInTheDocument();
  });

  it('invites a user, shows the link once, and the invitee joins', async () => {
    await signInAs('owner');
    const { user, router } = renderApp('/settings/users');
    await user.click(await screen.findByRole('button', { name: 'Invite user' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite user' });
    await user.type(within(dialog).getByLabelText('Name'), 'Dr. Neha Joshi');
    await user.type(within(dialog).getByLabelText('Phone or email'), '98765 43210');
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Create invite' })).toBeEnabled(),
    );
    expect(within(dialog).getByRole('button', { name: 'Therapist' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create invite' }));

    const share = await screen.findByRole('dialog', { name: 'Send the invite' });
    const url = within(share).getByLabelText('Invite link').textContent!;
    expect(url).toMatch(/\/invite\/mock-inv-\d+$/);
    await user.click(within(share).getByRole('button', { name: 'Done' }));
    expect(
      within(await screen.findByRole('region', { name: 'Pending invites' })).getByText(
        'Dr. Neha Joshi',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    await screen.findByRole('heading', { name: 'Sign in' });
    await act(() => router.navigate(new URL(url).pathname));
    expect(await screen.findByRole('heading', { name: 'Set your password' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Join ATP Rehab' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters.');
    await user.type(screen.getByLabelText('New password'), '-enough');
    await user.click(screen.getByRole('button', { name: 'Join ATP Rehab' }));
    expect(await screen.findAllByRole('heading', { name: 'My summary' })).not.toHaveLength(0);
  });

  it('deactivates a member', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/users');
    const list = await screen.findByRole('list', { name: 'Members' });
    const pooja = within(list).getByText('Pooja Shinde').closest('li')!;
    await user.click(within(pooja).getByRole('button', { name: 'Deactivate' }));
    expect(await within(pooja).findByText('Deactivated')).toBeInTheDocument();
    expect(within(list).getByText('(you)')).toBeInTheDocument();
  });
});
