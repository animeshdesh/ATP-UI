import { describe, expect, it, vi } from 'vitest';
import type { NewTransaction } from '@/domain/types';
import { flushOutbox, outbox, type SendResult } from './outbox';

const input = (key: string, amountPaise = 10000): NewTransaction & { idempotencyKey: string } => ({
  idempotencyKey: key,
  type: 'expense',
  amountPaise,
  category: 'Utilities',
  entryDate: '2026-10-14',
  paymentMode: 'Cash',
  partyKey: 'Sameer',
});

describe('outbox', () => {
  it('replays oldest first and stops at the first retryable failure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    for (const [i, k] of ['a', 'b', 'c'].entries()) {
      vi.setSystemTime(1000 + i);
      await outbox.add({ input: input(k), userKey: 'Sameer' });
    }
    vi.useRealTimers();

    const seen: string[] = [];
    const send = async (item: { key: string }): Promise<SendResult> => {
      seen.push(item.key);
      return item.key === 'b' ? 'retry' : 'sent';
    };
    expect(await flushOutbox('Sameer', send)).toEqual({ sent: 1 });
    expect(seen).toEqual(['a', 'b']);
    expect(outbox.snapshot().map((i) => [i.key, i.attempts])).toEqual([
      ['b', 1],
      ['c', 0],
    ]);
  });

  it('marks rejected items and skips them on later runs', async () => {
    await outbox.add({ input: input('x'), userKey: 'Sameer' });
    await flushOutbox('Sameer', async () => ({ rejected: 'Not allowed' }));
    expect(outbox.snapshot()[0]).toMatchObject({ key: 'x', error: 'Not allowed' });

    const send = vi.fn(async (): Promise<SendResult> => 'sent');
    await flushOutbox('Sameer', send);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not replay another user's entries", async () => {
    await outbox.add({ input: input('mine'), userKey: 'Anjali' });
    const send = vi.fn(async (): Promise<SendResult> => 'sent');
    await flushOutbox('Sameer', send);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns null while a flush is already running', async () => {
    await outbox.add({ input: input('slow'), userKey: 'Sameer' });
    let release: () => void = () => {};
    const first = flushOutbox(
      'Sameer',
      () => new Promise<SendResult>((r) => (release = () => r('sent'))),
    );
    expect(flushOutbox('Sameer', async () => 'sent')).toBeNull();
    await vi.waitFor(() => expect(release).not.toBe(undefined));
    release();
    expect(await first).toEqual({ sent: 1 });
  });
});
