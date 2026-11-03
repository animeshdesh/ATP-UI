import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { api } from '@/api';
import { renderApp, signInAs } from '@/test/render';

// Visit fees and dues (D-052), treatment plan and session numbers (D-053).
describe('dues and session plan', () => {
  it('completes a visit on "pay later" and shows what is pending', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/patients/pt-amit?tab=visits');
    // Tonight's session; earlier visits were paid before fees existed (opening balance).
    await user.click((await screen.findAllByRole('button', { name: /Wed .* 18:00–18:45/ }))[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'Appointment' });
    await user.click(within(sheet).getByRole('button', { name: 'Completed' }));
    expect(within(sheet).getByLabelText('Visit fee')).toHaveValue('800');
    await user.click(within(sheet).getByRole('radio', { name: 'Pay later' }));
    expect(within(sheet).getByRole('status')).toHaveTextContent('₹800 pending after this visit');
    await user.click(within(sheet).getByRole('button', { name: 'Mark completed' }));
    expect(await screen.findByText(/Completed · Amit Joshi · ₹800 pending/)).toBeInTheDocument();
    await user.click(within(sheet).getAllByRole('button', { name: 'Close' }).at(-1)!);

    expect(
      await screen.findByText(
        (_, el) =>
          el?.tagName === 'BUTTON' &&
          /Session 3 · Dr\. Anjali · ₹800 pending/.test(el.textContent ?? ''),
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Payments' }));
    let banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('₹800 pending');
    await user.click(within(banner).getByRole('button', { name: 'Collect ₹800' }));
    // Part payments (D-057): the amount starts at what is pending and can be lowered.
    let pay = await screen.findByRole('dialog', { name: /Collect pending/ });
    expect(within(pay).getByLabelText('Amount')).toHaveValue('800');
    await user.clear(within(pay).getByLabelText('Amount'));
    await user.type(within(pay).getByLabelText('Amount'), '900');
    expect(within(pay).getByRole('alert')).toHaveTextContent('Collect up to ₹800');
    expect(within(pay).getByRole('button', { name: 'Collect ₹900' })).toBeDisabled();
    await user.clear(within(pay).getByLabelText('Amount'));
    await user.type(within(pay).getByLabelText('Amount'), '500');
    expect(within(pay).getByRole('status')).toHaveTextContent('₹300 stays pending');
    await user.click(within(pay).getByRole('button', { name: 'Collect ₹500' }));

    banner = await screen.findByText(
      (_, el) => el?.getAttribute('role') === 'status' && /₹300 pending/.test(el.textContent ?? ''),
    );
    await user.click(within(banner).getByRole('button', { name: 'Collect ₹300' }));
    pay = await screen.findByRole('dialog', { name: /Collect pending/ });
    await user.click(within(pay).getByRole('button', { name: 'Collect ₹300' }));
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText(/₹300 pending/)).not.toBeInTheDocument();
  });

  it('pay now records the full fee, with only the payment mode to pick', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/patients/pt-amit?tab=visits');
    await user.click((await screen.findAllByRole('button', { name: /Wed .* 18:00–18:45/ }))[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'Appointment' });
    await user.click(within(sheet).getByRole('button', { name: 'Completed' }));
    expect(within(sheet).getByRole('radio', { name: 'Pay now' })).toBeChecked();
    expect(within(sheet).queryByLabelText(/Amount/)).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('radio', { name: 'Cash' }));
    await user.click(within(sheet).getByRole('button', { name: 'Mark completed' }));
    expect(await screen.findByText('Completed · Amit Joshi · ₹800 Cash')).toBeInTheDocument();
  });

  it('filters the list to patients who owe', async () => {
    await signInAs('owner');
    const { user } = renderApp('/patients');
    await screen.findAllByText('Priya Kulkarni');
    await user.click(screen.getByRole('radio', { name: 'Pending ₹' }));
    // Sunita's home visit today was left on "pay later" (seed).
    expect((await screen.findAllByText('Sunita Pawar')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Priya Kulkarni')).not.toBeInTheDocument();
    expect(screen.getAllByText('₹1,200 due').length).toBeGreaterThan(0);
  });

  it('tracks the plan, numbers sessions and lists every package', async () => {
    await signInAs('owner');
    const { user } = renderApp('/patients/pt-priya');
    const plan = (await screen.findByText('Treatment plan')).closest('section')!;
    expect(within(plan).getByText('6 of 12 sessions')).toBeInTheDocument();
    expect(within(plan).getByText('6 left')).toBeInTheDocument();
    await user.click(within(plan).getByRole('button', { name: 'Edit plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Treatment plan' });
    await user.clear(within(dialog).getByLabelText('Planned sessions'));
    await user.type(within(dialog).getByLabelText('Planned sessions'), '8');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('6 of 8 sessions')).toBeInTheDocument();

    // The package lists all its sessions: 6 used, Friday's booking takes the 7th, 3 to book.
    await user.click(screen.getByRole('tab', { name: 'Sessions' }));
    const sessions = await screen.findByRole('region', { name: 'Package sessions' });
    expect(within(sessions).getByRole('button', { name: /Session 6 of 10/ })).toBeInTheDocument();
    expect(
      within(sessions).getByRole('button', { name: /Fri .*Session 7 of 10/ }),
    ).toBeInTheDocument();
    expect(within(sessions).getAllByText('Not booked')).toHaveLength(3);
    expect(within(sessions).getAllByRole('button', { name: 'Book' })).toHaveLength(1);
    expect(screen.queryByText('Other sessions')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Payments' }));
    const packages = await screen.findByRole('region', { name: 'Packages' });
    expect(within(packages).getByText('Active')).toBeInTheDocument();
    expect(within(packages).getByText('10 sessions')).toBeInTheDocument();
  });

  it('shows a therapist no money figures', async () => {
    await signInAs('therapist');
    renderApp('/patients/pt-priya');
    expect(await screen.findByText('Since')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Advance')).not.toBeInTheDocument();
  });
});

describe('packages on pay later (D-057)', () => {
  it('owes the price from the sale and takes it in parts', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/patients/pt-rohan?tab=payments');
    await user.click(await screen.findByRole('button', { name: 'Sell package' }));
    const sheet = await screen.findByRole('dialog', { name: 'Sell package' });
    const field = (label: string) =>
      within(sheet).getByText(label).closest('label')!.querySelector('input')!;
    await user.clear(field('Sessions'));
    await user.type(field('Sessions'), '12');
    await user.clear(field('Price ₹'));
    await user.type(field('Price ₹'), '9600');
    await user.click(within(sheet).getByRole('radio', { name: 'Pay later' }));
    expect(within(sheet).getByRole('status')).toHaveTextContent('₹9,600 pending from today');
    await user.click(within(sheet).getByRole('button', { name: 'Sell · ₹9,600 pending' }));

    const packages = await screen.findByRole('region', { name: 'Packages' });
    expect(await within(packages).findByText(/₹9,600 pending/)).toBeInTheDocument();
    let banner = screen.getByText(
      (_, el) =>
        el?.getAttribute('role') === 'status' && /₹9,600 pending/.test(el.textContent ?? ''),
    );
    await user.click(within(banner).getByRole('button', { name: 'Collect ₹9,600' }));
    let pay = await screen.findByRole('dialog', { name: /Collect pending/ });
    // Filed under Package income: the package is the oldest charge still owed.
    expect(within(pay).getByText(/as Package income/)).toBeInTheDocument();
    await user.clear(within(pay).getByLabelText('Amount'));
    await user.type(within(pay).getByLabelText('Amount'), '5000');
    await user.click(within(pay).getByRole('button', { name: 'Collect ₹5,000' }));
    expect(await within(packages).findByText(/₹5,000 of ₹9,600 paid/)).toBeInTheDocument();

    banner = screen.getByText(
      (_, el) =>
        el?.getAttribute('role') === 'status' && /₹4,600 pending/.test(el.textContent ?? ''),
    );
    await user.click(within(banner).getByRole('button', { name: 'Collect ₹4,600' }));
    pay = await screen.findByRole('dialog', { name: /Collect pending/ });
    await user.click(within(pay).getByRole('button', { name: 'Collect ₹4,600' }));
    expect(await within(packages).findByText(/₹9,600 paid/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(await screen.findByText('Prepaid')).toBeInTheDocument();
    expect(screen.getAllByText('12 left')).toHaveLength(2);
  });

  it('shows an unpaid package as Package, not Prepaid', async () => {
    await signInAs('owner');
    await api.sellPackage('pt-rohan', {
      name: '6 sessions',
      sessionsTotal: 6,
      pricePaise: 480000,
      paidPaise: 100000,
      mode: 'cash',
      branchId: 'br-kvn',
    });
    renderApp('/patients/pt-rohan');
    expect(await screen.findByText('Package')).toBeInTheDocument();
    expect(screen.queryByText('Prepaid')).not.toBeInTheDocument();
    expect(screen.getByText(/₹1,000 of ₹4,800 paid/)).toBeInTheDocument();
  });
});
