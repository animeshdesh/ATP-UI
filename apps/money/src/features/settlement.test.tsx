import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { api } from '@/api';
import { renderApp, signInAs } from '@/test/render';

const panel = () =>
  screen.findByText(/^Settle up · /).then((h) => h.closest('div.flex.flex-col')! as HTMLElement);

describe('settlement (L4 shapes, mock mode)', () => {
  it('settles partner pockets and staff vs clinic account, locks entries, and undoes', async () => {
    await signInAs('owner');
    const { user, router } = renderApp('/settlement');
    const box = await panel();
    expect(within(box).getByText('Settle up · 1–14 Oct 2026')).toBeInTheDocument();
    // D-028 on the seed: RY holds ₹10,262.50 too much; Anjali deposits her net cash with the clinic.
    expect(within(box).getByText('₹10,263')).toBeInTheDocument();
    expect(within(box).getAllByText('Clinic account')).toHaveLength(1);
    expect(within(box).getByText('₹3,220')).toBeInTheDocument();

    await user.click(within(box).getByRole('button', { name: 'Mark as settled' }));
    expect(await screen.findByText('Settlement recorded · 4 payments')).toBeInTheDocument();
    expect(await screen.findByText(/^Settled on /)).toBeInTheDocument();
    const history = await screen.findByRole('region', { name: 'Settlement history' });

    await act(() => router.navigate('/transactions'));
    const list = await screen.findByRole('list', { name: 'Entries' });
    const kinesio = await within(list).findByRole('button', { name: /^Kinesio tape/ });
    expect(within(kinesio).getByText('Locked')).toBeInTheDocument();

    await act(() => router.navigate('/settlement'));
    await user.click(
      within(await screen.findByRole('region', { name: 'Settlement history' })).getByRole(
        'button',
        { name: 'Undo' },
      ),
    );
    expect(
      await screen.findByText('Settlement undone. Its entries are open again.'),
    ).toBeInTheDocument();
    expect(await within(await panel()).findByText('₹10,263')).toBeInTheDocument();
    expect(history).toBeDefined();
  });

  it('refuses to settle when entries changed after the page loaded', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settlement');
    const box = await panel();
    await within(box).findByText('₹10,263');
    await api.createTransaction({
      type: 'income',
      amountPaise: 50000,
      categoryId: 'cat-home-visit',
      description: 'Late entry',
    });
    await user.click(within(box).getByRole('button', { name: 'Mark as settled' }));
    expect(await screen.findByText(/Entries changed since you opened this/)).toBeInTheDocument();
  });

  it('requires profit shares to total 100%', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settlement');
    await user.click(await screen.findByRole('button', { name: 'Edit profit shares' }));
    const dialog = await screen.findByRole('dialog', { name: 'Profit shares' });
    const first = await within(dialog).findByLabelText('Dr. Sameer Ushkewar (%)');
    await user.clear(first);
    await user.type(first, '40');
    await user.click(within(dialog).getByRole('button', { name: 'Save shares' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Shares add up to 115.00%');
    await user.clear(within(dialog).getByLabelText('Dr. Rushikesh Yannawar (%)'));
    await user.type(within(dialog).getByLabelText('Dr. Rushikesh Yannawar (%)'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Save shares' }));
    expect(await screen.findByText('Profit shares saved')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Profit share 40%')).toBeInTheDocument());
  });

  it('lets the CA view the position without settling', async () => {
    await signInAs('ca');
    renderApp('/settlement');
    const box = await panel();
    expect(await within(box).findByText('₹10,263')).toBeInTheDocument();
    expect(within(box).queryByRole('button', { name: 'Mark as settled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profit shares' })).not.toBeInTheDocument();
  });
});
