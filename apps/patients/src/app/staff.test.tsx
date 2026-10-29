import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

const dialog = (name: string | RegExp) => screen.findByRole('dialog', { name });

describe('patients app (staff)', () => {
  it('signs in with the patients brand and lands on the calendar', async () => {
    const { user } = renderApp('/');
    expect(await screen.findByText('ATP Patients · staff only')).toBeInTheDocument();
    expect(screen.getByText('Same account as ATP Money.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Phone or email'), 'owner@atp.local');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findAllByText('Amit Joshi')).length).toBeGreaterThan(0);
  });

  it('books from a request for a known patient and sends the WhatsApp confirmation', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/inquiries');
    const card = (await screen.findAllByText('Priya K.'))[0]!.closest(
      'div.border-2',
    ) as HTMLElement;
    expect(within(card).getByText(/Known patient · Priya Kulkarni/)).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Book' }));

    const sheet = await dialog('Book from request');
    expect(within(sheet).getByText('Existing patient found')).toBeInTheDocument();
    // Preferred: tomorrow (Thu) morning at Karvenagar, when Dr. Anjali is on leave.
    expect(await within(sheet).findByText(/Dr\. Anjali is on leave that day/)).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: /Dr\. Sameer/ }));
    const slot = await within(sheet).findAllByRole('button', { name: /^\d\d:\d\d$/ });
    await user.click(slot[0]!);
    await user.click(within(sheet).getByRole('button', { name: /^Confirm · Thu 09:00/ }));

    const done = await dialog('Booked');
    expect(within(done).getByText('Priya Kulkarni')).toBeInTheDocument();
    const wa = within(done).getByRole('link', { name: /Send on WhatsApp/ });
    expect(wa.getAttribute('href')).toContain('https://wa.me/919822041721?text=Hi%20Priya');
    await user.click(within(done).getByRole('button', { name: 'Done' }));

    // The request moved to Booked.
    await user.click(screen.getByRole('tab', { name: /Booked/ }));
    expect((await screen.findAllByText('Priya K.')).length).toBeGreaterThan(0);
  });

  it('blocks a clash, warns outside hours, then books anyway', async () => {
    await signInAs('owner');
    const { user } = renderApp('/patients');
    await user.click((await screen.findAllByText('Kavita Nair'))[0]!);
    await user.click(await screen.findByRole('button', { name: /^Book$/ }));
    const sheet = await dialog('New appointment');
    expect(within(sheet).getByText('Kavita Nair')).toBeInTheDocument();

    // Today (Wed) Dr. Anjali has Amit Joshi at 18:00–18:45 in Kothrud.
    await user.click(within(sheet).getByRole('button', { name: /Dr\. Anjali/ }));
    const time = within(sheet).getByLabelText('Or type a time');
    fireEvent.change(time, { target: { value: '18:15' } });
    expect(
      await within(sheet).findByText(/Dr\. Anjali already has Amit Joshi at 18:00–18:45/),
    ).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /^Save/ })).toBeDisabled();

    fireEvent.change(time, { target: { value: '14:00' } });
    expect(
      await within(sheet).findByText(/Outside Dr\. Anjali's working hours/),
    ).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Book anyway' }));
    await user.click(within(sheet).getByRole('button', { name: /^Save · Wed 14:00/ }));
    expect(await screen.findByText(/Booked Kavita Nair · Wed 28 Oct, 14:00/)).toBeInTheDocument();
  });

  it('completes a session using the package and records the payment', async () => {
    await signInAs('owner');
    const { user } = renderApp('/patients');
    await user.click((await screen.findAllByText('Priya Kulkarni'))[0]!);
    expect(await screen.findByText('4 left')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Visits' }));
    // Friday's confirmed session.
    const upcoming = await screen.findAllByRole('button', { name: /Fri .* 09:00–09:45/ });
    await user.click(upcoming[0]!);
    const sheet = await dialog('Appointment');
    await user.click(within(sheet).getByRole('button', { name: 'Completed' }));
    expect(
      within(sheet).getByRole('checkbox', { name: /Use 1 session of 10 sessions/ }),
    ).toBeChecked();
    await user.click(within(sheet).getByRole('checkbox', { name: /Record a payment too/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Mark completed' }));
    expect(await within(sheet).findByText('Marked completed.')).toBeInTheDocument();
    await user.click(within(sheet).getAllByRole('button', { name: 'Close' }).at(-1)!);

    await user.click(screen.getByRole('tab', { name: 'Payments' }));
    expect(await screen.findByText('3 left')).toBeInTheDocument();
    expect(await screen.findByText(/Session · 30 Oct/)).toBeInTheDocument();
  });

  it('hides clinical notes from the front desk', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/patients/pt-priya');
    await user.click(await screen.findByRole('tab', { name: 'Notes' }));
    expect(
      await screen.findByText('Clinical notes are visible to therapists and owners.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Patellofemoral/)).not.toBeInTheDocument();
  });

  it('lets a therapist write a session note on their own patient', async () => {
    await signInAs('therapist');
    const { user } = renderApp('/patients/pt-priya?tab=notes');
    expect(await screen.findByText(/Patellofemoral pain/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Note'), 'Pain 3/10. Single-leg squats.');
    await user.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Pain 3/10. Single-leg squats.')).toBeInTheDocument();
  });

  it('scopes a therapist to their own day and hides the request queue', async () => {
    await signInAs('therapist');
    renderApp('/');
    expect((await screen.findAllByText('Amit Joshi')).length).toBeGreaterThan(0);
    // Sunita is Dr. Rushikesh's home visit, Rohan is Dr. Sameer's.
    expect(screen.queryByText('Sunita Pawar')).not.toBeInTheDocument();
    expect(screen.queryByText('Rohan Gokhale')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Inquiries/ })).not.toBeInTheDocument();
  });

  it('shows branches to owners only', async () => {
    await signInAs('frontdesk');
    renderApp('/settings/branches');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
  });

  it('lets an owner add a branch that appears in the picker', async () => {
    await signInAs('owner');
    const { user } = renderApp('/settings/branches');
    await screen.findAllByText('Kothrud');
    await user.click(screen.getAllByRole('button', { name: 'Add branch' })[0]!);
    const sheet = await dialog('Add branch');
    await user.type(within(sheet).getByLabelText('Branch name'), 'Baner');
    expect(within(sheet).getByLabelText('Short code')).toHaveValue('BAN');
    await user.type(within(sheet).getByLabelText('Address'), 'Baner Road, Pune');
    await user.click(within(sheet).getByRole('button', { name: 'Add branch' }));
    await waitFor(() =>
      expect(screen.getAllByRole('option', { name: 'Baner' }).length).toBeGreaterThan(0),
    );
  });
});
