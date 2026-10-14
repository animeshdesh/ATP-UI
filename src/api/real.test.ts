import { describe, expect, it } from 'vitest';
import { filenameFrom } from './real';

const res = (cd?: string) => new Response('', cd ? { headers: { 'content-disposition': cd } } : {});

describe('filenameFrom', () => {
  it('reads the server filename (CORS-exposed Content-Disposition)', () => {
    expect(
      filenameFrom(res('attachment; filename="atp-rehab-accounts-2026-09.pdf"'), '2026-09', 'pdf'),
    ).toBe('atp-rehab-accounts-2026-09.pdf');
    expect(
      filenameFrom(
        res("attachment; filename*=UTF-8''ATP%20Rehab%202026-09.xlsx"),
        '2026-09',
        'xlsx',
      ),
    ).toBe('ATP Rehab 2026-09.xlsx');
  });
  it('falls back to the documented pattern', () => {
    expect(filenameFrom(res(), '2026-09', 'csv')).toBe('atp-rehab-accounts-2026-09.csv');
  });
});
