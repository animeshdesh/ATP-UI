import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

const budgetRow = async (name: string) => {
  const section = await screen.findByRole('region', { name: 'Budgets' });
  return (await within(section).findByText(name)).closest('div.grid') as HTMLElement;
};
const fundCard = async (name: string) => {
  const section = await screen.findByRole('region', { name: 'Funds' });
  return (await within(section).findByText(name)).closest('div.flex-col') as HTMLElement;
};

describe('budgets & funds (L6 shapes, mock mode)', () => {
  it('shows status from spend and lets an owner change a budget', async () => {
    await signInAs('owner');
    const { user } = renderApp('/budgets');
    const rent = await budgetRow('Rent');
    expect(within(rent).getByText('Near limit')).toBeInTheDocument();
    expect(within(rent).getByText('97%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit budgets' }));
    const dialog = await screen.findByRole('dialog', { name: 'Monthly budgets' });
    const input = within(dialog).getByLabelText('Rent');
    await user.clear(input);
    await user.type(input, '50000');
    await user.click(within(dialog).getByRole('button', { name: 'Save budgets' }));
    expect(await screen.findByText('Budgets saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect(within(await budgetRow('Rent')).getByText('Over budget')).toBeInTheDocument(),
    );
    expect(within(await budgetRow('Rent')).getByText('120%')).toBeInTheDocument();
  });

  it('creates a fund and tops one up', async () => {
    await signInAs('owner');
    const { user } = renderApp('/budgets');
    expect(
      within(await fundCard('Emergency reserve')).getByText('₹10,000 fixed each month'),
    ).toBeInTheDocument();
    expect(
      within(await fundCard('Equipment fund')).getByText('10% of monthly net'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New fund' }));
    const dialog = await screen.findByRole('dialog', { name: 'New fund' });
    await user.type(within(dialog).getByLabelText('Name'), 'Laser machine');
    await user.click(within(dialog).getByRole('radio', { name: 'Fixed' }));
    await user.type(within(dialog).getByLabelText('Each month (₹)'), '5000');
    await user.click(within(dialog).getByRole('button', { name: 'Add fund' }));
    const laser = await fundCard('Laser machine');
    expect(within(laser).getByText('₹5,000')).toBeInTheDocument();

    await user.click(within(laser).getByRole('button', { name: 'Top up' }));
    const top = await screen.findByRole('dialog', { name: 'Top up Laser machine' });
    await user.type(within(top).getByLabelText('Amount (₹)'), '1500');
    await user.click(within(top).getByRole('button', { name: 'Top up' }));
    expect(await screen.findByText('Topped up Laser machine by ₹1,500')).toBeInTheDocument();
    await waitFor(async () =>
      expect(within(await fundCard('Laser machine')).getByText('₹6,500')).toBeInTheDocument(),
    );
  });

  it('draws an expense from a fund', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await screen.findByRole('list', { name: 'Entries' });
    await user.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    await user.type(within(sheet).getByLabelText('Amount'), '9000');
    await user.click(await within(sheet).findByRole('button', { name: 'Equipment' }));
    await user.selectOptions(
      await within(sheet).findByLabelText('Draw from fund (optional)'),
      'Equipment fund',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Description, receipt photo' }));
    await user.type(within(sheet).getByLabelText('Description (optional)'), 'Exercise ball set');
    await user.click(within(sheet).getByRole('button', { name: 'Save ₹9,000 · Equipment' }));
    const list = await screen.findByRole('list', { name: 'Entries' });
    const row = await within(list).findByRole('button', { name: /^Exercise ball set/ });
    expect(within(row).getByText('From Equipment fund')).toBeInTheDocument();
  });

  it('hides the fund picker for income', async () => {
    await signInAs('owner');
    const { user } = renderApp('/transactions');
    await screen.findByRole('list', { name: 'Entries' });
    await user.click(screen.getAllByRole('button', { name: /add entry/i })[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'New entry' });
    await within(sheet).findByLabelText('Draw from fund (optional)');
    await user.click(within(sheet).getByRole('radio', { name: 'Income' }));
    expect(within(sheet).queryByLabelText('Draw from fund (optional)')).not.toBeInTheDocument();
  });
});
