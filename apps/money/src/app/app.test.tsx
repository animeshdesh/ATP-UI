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
    expect(await within(attention).findByText('Rent at 97% of budget')).toBeInTheDocument();
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

  it('links owners to user management in ATP Patients (D-051)', async () => {
    await signInAs('owner');
    renderApp('/more');
    // Sidebar and More both carry the link.
    const links = await screen.findAllByRole('link', { name: /Manage users in ATP Patients/ });
    for (const link of links)
      expect(link).toHaveAttribute('href', 'https://patient.atprehab.si/settings/users');
  });

  it('hides the user management link from a therapist', async () => {
    await signInAs('therapist');
    renderApp('/more');
    await screen.findAllByRole('button', { name: 'Sign out' });
    expect(screen.queryByRole('link', { name: /Manage users/ })).not.toBeInTheDocument();
  });
});
