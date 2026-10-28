import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

describe('public booking request (/book)', () => {
  it('validates, sends a request, and the front desk sees it as new', async () => {
    const { user } = renderApp('/book');
    expect(await screen.findByRole('heading', { name: 'Book a session' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Request a call back/ }));
    expect(screen.getByText('Choose a branch.')).toBeInTheDocument();
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a 10-digit mobile number.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Kothrud/ }));
    await user.type(screen.getByLabelText('Full name'), 'Ravi Kale');
    await user.type(screen.getByLabelText('Phone'), '98765 43210');
    await user.click(screen.getByRole('radio', { name: 'Evening' }));
    await user.type(screen.getByLabelText(/Reason/), 'Back pain');
    await user.click(screen.getByRole('button', { name: /Request a call back/ }));

    expect(await screen.findByRole('heading', { name: 'Request sent' })).toBeInTheDocument();
    expect(screen.getByText('+91 98xxx xxx10')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow · Evening')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call \+91 98220 41737/ })).toBeInTheDocument();

    await signInAs('frontdesk');
    renderApp('/inquiries');
    const row = (await screen.findAllByText('Ravi Kale'))[0]!.closest('div.border-2')!;
    expect(within(row as HTMLElement).getByText('Back pain')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Kothrud')).toBeInTheDocument();
  });

  it('rate-limits a flood of requests', async () => {
    const { user } = renderApp('/book');
    await screen.findByRole('heading', { name: 'Book a session' });
    const send = async (name: string) => {
      await user.click(screen.getByRole('radio', { name: /Karvenagar/ }));
      await user.type(screen.getByLabelText('Full name'), name);
      await user.type(screen.getByLabelText('Phone'), '9876543210');
      await user.click(screen.getByRole('button', { name: /Request a call back/ }));
    };
    for (let i = 0; i < 5; i++) {
      await send(`Person ${i}`);
      await user.click(await screen.findByRole('button', { name: 'Send another request' }));
    }
    await send('Person 6');
    expect(await screen.findByText(/Too many requests from this phone/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request a call back/ })).toBeDisabled();
  });
});
