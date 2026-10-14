import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp, signInAs } from '@/test/render';

describe('CA report (L7 shapes, mock mode)', () => {
  beforeEach(() => {
    // jsdom has no object URLs; the download helper only needs them to exist.
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('previews a month and moves to the current month', async () => {
    await signInAs('owner');
    const { user } = renderApp('/reports');
    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    const preview = await screen.findByRole('article', { name: 'Report preview' });
    expect(await within(preview).findByText('No entries this month.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByText('month to date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    const oct = await screen.findByRole('article', { name: 'Report preview' });
    expect(await within(oct).findByText('Transactions (17)')).toBeInTheDocument();
    expect(within(oct).getByText('₹11,400')).toBeInTheDocument();
    expect(within(oct).getByText(/11 more rows/)).toBeInTheDocument();
  });

  it('downloads exports and falls back to download without a share sheet', async () => {
    await signInAs('owner');
    const { user } = renderApp('/reports');
    await screen.findByRole('article', { name: 'Report preview' });
    await user.click(screen.getByRole('button', { name: 'CSV' }));
    expect(await screen.findByText('Downloaded atp-rehab-accounts-2026-09.csv')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share PDF' }));
    expect(await screen.findByText('Downloaded atp-rehab-accounts-2026-09.pdf')).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Email to CA')).not.toBeInTheDocument();
  });

  it('shares the PDF through the share sheet when the device supports files', async () => {
    const share = vi.fn(async () => {});
    Object.assign(navigator, { canShare: () => true, share });
    await signInAs('owner');
    const { user } = renderApp('/reports');
    await screen.findByRole('article', { name: 'Report preview' });
    await user.click(screen.getByRole('button', { name: 'Share PDF' }));
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const files = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(files[0]!.name).toBe('atp-rehab-accounts-2026-09.pdf');
    expect(files[0]!.type).toBe('application/pdf');
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });
});
