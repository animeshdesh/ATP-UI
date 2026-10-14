import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

const entries = () => screen.findByRole('list', { name: 'Entries' });
const row = async (title: RegExp) => within(await entries()).findByRole('button', { name: title });

describe('ledger (L3 shapes, mock mode)', () => {
  it('edits an entry from the list (F-06)', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await user.click(await row(/^Kinesio tape, 6 rolls/));
    const sheet = await screen.findByRole('dialog', { name: 'Edit entry' });
    const amount = within(sheet).getByLabelText('Amount');
    expect(amount).toHaveValue('3240');
    await user.clear(amount);
    await user.type(amount, '3500');
    await user.click(within(sheet).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Updated ₹3,500 · Consumables')).toBeInTheDocument();
    expect(await row(/^Kinesio tape, 6 rolls, −₹3,500/)).toBeInTheDocument();
  });

  it('deletes after confirmation and logs it to the audit trail', async () => {
    await signInAs('owner');
    const { user, router } = renderApp('/transactions');
    await user.click(await row(/^Auto fare, Kothrud/));
    const sheet = await screen.findByRole('dialog', { name: 'Edit entry' });
    await user.click(within(sheet).getByRole('button', { name: 'Delete entry' }));
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted ₹180 · Travel (home visits)')).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        within(await entries()).queryByRole('button', { name: /^Auto fare/ }),
      ).not.toBeInTheDocument(),
    );
    await router.navigate('/audit');
    const deleted = await screen.findAllByText('Soft-deleted');
    expect(deleted[0]!.closest('li')).toHaveTextContent('Expense · Travel (home visits)');
  });

  it('shows entries past the 7-day window read-only for front desk', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/transactions');
    await user.click(await row(/^Post-op ACL/));
    const sheet = await screen.findByRole('dialog', { name: 'Entry' });
    expect(
      within(sheet).getByText(/Locked: entries can be changed for 7 days/),
    ).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('filters on the server and shows totals for all matches', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await entries();
    await user.click(screen.getByRole('radio', { name: 'Income' }));
    await user.selectOptions(screen.getByLabelText('Payment mode'), 'upi');
    const count = async () => within(await entries()).getAllByRole('button').length;
    await waitFor(async () => expect(await count()).toBe(3));
    expect(screen.getByText('₹3,200')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Person'), 'clinic');
    await waitFor(async () => expect(await count()).toBe(1));
    expect(await row(/^Post-op ACL, \+₹800/)).toBeInTheDocument();
  });

  it('attaches a receipt photo to a new entry (F-04)', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await entries();
    await user.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    await user.type(within(sheet).getByLabelText('Amount'), '450');
    await user.click(await within(sheet).findByRole('button', { name: 'Consumables' }));
    await user.click(within(sheet).getByRole('button', { name: 'Description, receipt photo' }));
    await user.type(within(sheet).getByLabelText('Description (optional)'), 'Gel tubes');
    const file = new File(['x'.repeat(1000)], 'bill.jpg', { type: 'image/jpeg' });
    await user.upload(sheet.querySelector('input[type=file]') as HTMLInputElement, file);
    expect(within(sheet).getByText('bill.jpg attached')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Save ₹450 · Consumables' }));
    const gel = await row(/^Gel tubes/);
    expect(within(gel).getByText('Receipt')).toBeInTheDocument();
  });

  it('manages categories: add, rename, reorder, archive and restore', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/categories');
    const list = await screen.findByRole('list', { name: 'expense categories' });
    await user.type(screen.getByLabelText('New category name'), 'Laundry');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await within(list).findByText('Laundry')).toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Rename Laundry' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename category' });
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Linen & laundry');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(list).findByText('Linen & laundry')).toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Move Salaries up' }));
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Salaries'),
    );

    await user.click(within(list).getByRole('button', { name: 'Archive Linen & laundry' }));
    const archived = await screen.findByRole('region', { name: 'Archived categories' });
    expect(await within(archived).findByText('Linen & laundry')).toBeInTheDocument();
    const linen = within(archived).getByText('Linen & laundry').parentElement!;
    await user.click(within(linen).getByRole('button', { name: 'Restore' }));
    expect(await within(list).findByText('Linen & laundry')).toBeInTheDocument();
  });
});
