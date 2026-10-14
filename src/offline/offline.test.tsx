import { screen, within } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { api } from '@/api';
import { renderApp, signInAs } from '@/test/render';
import { setOnline } from '@/test/network';

describe('offline entries (F-08)', () => {
  it('queues an entry offline and syncs it on reconnect', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await screen.findByText('Kinesio tape, 6 rolls');

    act(() => setOnline(false, true));
    expect(
      await screen.findByText(/^Offline\. New entries are saved on this device/),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    expect(within(sheet).getByText(/this entry is kept on your device/)).toBeInTheDocument();
    await user.type(within(sheet).getByLabelText('Amount'), '90');
    await user.click(await within(sheet).findByRole('button', { name: 'Utilities' }));
    await user.click(within(sheet).getByRole('button', { name: 'Description, receipt photo' }));
    await user.type(within(sheet).getByLabelText('Description (optional)'), 'Water cans');
    await user.click(within(sheet).getByRole('button', { name: 'Save ₹90 · Utilities' }));

    expect(await screen.findByText(/Saved offline · ₹90 · Utilities/)).toBeInTheDocument();
    const pending = screen.getByRole('region', { name: 'Waiting to sync' });
    expect(within(pending).getByText('Water cans')).toBeInTheDocument();
    expect(within(pending).getByText('Waiting to sync')).toBeInTheDocument();
    expect(screen.getByText(/1 entry waiting to sync/)).toBeInTheDocument();

    act(() => setOnline(true, true));
    expect(await screen.findByText('Synced 1 offline entry')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Waiting to sync' })).not.toBeInTheDocument();
    expect(await screen.findByText('Water cans')).toBeInTheDocument();
  });

  it('creates one entry when the same idempotency key is replayed', async () => {
    await signInAs('owner');
    const input = {
      idempotencyKey: 'k-1',
      type: 'expense' as const,
      amountPaise: 5000,
      categoryId: 'cat-utilities',
      entryDate: '2026-10-14',
      paymentMode: 'cash' as const,
      partyMemberId: null,
      description: 'Replayed once',
    };
    const a = await api.createTransaction(input);
    const b = await api.createTransaction(input);
    expect(b.id).toBe(a.id);
    const page = await api.listTransactions({ search: 'Replayed once' });
    expect(page.totals.count).toBe(1);
  });
});
