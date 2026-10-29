import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockMembers } from '@atp/core/mock';
import { renderApp, signInAs } from '@/test/render';

// Users & roles moved here from ATP Money (D-051).
describe('users & roles (L2 shapes, mock mode)', () => {
  it('cycles a role permission but never reduces Owner', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/roles');
    const table = within(await screen.findByRole('table', { name: 'Role permissions' }));
    await user.click(table.getByRole('button', { name: 'Edit any entry, Therapist: None' }));
    expect(
      await table.findByRole('button', { name: 'Edit any entry, Therapist: All' }),
    ).toBeInTheDocument();
    await user.click(table.getByRole('button', { name: 'Edit any entry, Owner: All' }));
    expect(table.getByRole('button', { name: 'Edit any entry, Owner: All' })).toBeInTheDocument();
    // V2 permissions are live, not dimmed under "Later versions".
    expect(table.getByText('Patients & appointments')).toBeInTheDocument();
  });

  it('shows one role at a time on phones, starting with an editable one', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/roles');
    const phone = within(await screen.findByRole('region', { name: 'Permissions by role' }));
    expect(phone.getByRole('button', { name: /^Therapist/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(phone.getByRole('button', { name: 'Edit any entry, Therapist: None' }));
    expect(
      await phone.findByRole('button', { name: 'Edit any entry, Therapist: All' }),
    ).toBeInTheDocument();
    await user.click(phone.getByRole('button', { name: /^Owner/ }));
    expect(phone.getByRole('button', { name: 'Edit any entry, Owner: All' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
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

    await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    await screen.findByRole('heading', { name: 'Sign in' });
    await act(() => router.navigate(new URL(url).pathname));
    // The invite loads after the sign-out reset; slow under a full parallel run.
    expect(
      await screen.findByRole('heading', { name: 'Set your password' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'long-enough');
    await user.click(screen.getByRole('button', { name: 'Join ATP Rehab' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect((await screen.findAllByText('Amit Joshi')).length).toBeGreaterThan(0);
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

  it('links Users & roles from Settings for owners', async () => {
    await signInAs('owner');
    renderApp('/settings/branches');
    expect(await screen.findByRole('link', { name: 'Users & roles' })).toHaveAttribute(
      'href',
      '/settings/users',
    );
  });

  it('keeps therapists out of user management', async () => {
    await signInAs('therapist');
    renderApp('/settings/users');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users & roles' })).not.toBeInTheDocument();
  });
  it('renames a member and changes their roles', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/users');
    const list = within(await screen.findByRole('list', { name: 'Members' }));
    await user.click(list.getByRole('button', { name: 'Edit Dr. Anjali Deshmukh' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit Dr. Anjali Deshmukh' }));
    const name = dialog.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Dr. Anjali D.');
    await user.click(await dialog.findByRole('button', { name: 'Owner' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Dr. Anjali D. updated')).toBeInTheDocument();
    const row = within(list.getByText('Dr. Anjali D.').closest('li')!);
    expect(row.getByText('Owner')).toBeInTheDocument();
    expect(row.getByText('Therapist')).toBeInTheDocument();
  });

  it('keeps someone able to edit roles (last_admin)', async () => {
    for (const m of mockMembers())
      if (m.userId !== 'Sameer' && m.roles.some((r) => r.name === 'Owner'))
        m.status = 'deactivated';
    await signInAs('owner');
    const { user } = renderApp('/settings/users');
    const list = within(await screen.findByRole('list', { name: 'Members' }));
    await user.click(list.getByRole('button', { name: 'Edit Dr. Sameer Ushkewar' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(await dialog.findByRole('button', { name: 'Owner' }));
    await user.click(dialog.getByRole('button', { name: 'Therapist' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Someone must keep a role that can edit roles',
    );
  });
});
