import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('₹800 pending for completed visits');
    await user.click(within(banner).getByRole('button', { name: 'Collect ₹800' }));
    const pay = await screen.findByRole('dialog', { name: /Record payment/ });
    expect(within(pay).getByLabelText('Amount')).toHaveValue('800');
    await user.click(within(pay).getByRole('button', { name: 'Record ₹800' }));
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText('₹800 pending for completed visits')).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('tab', { name: 'Visits' }));
    expect(await screen.findByText(/Session 6 of 8/)).toBeInTheDocument();
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
