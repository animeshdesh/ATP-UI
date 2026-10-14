import { describe, expect, it } from 'vitest';
import { onRequest } from './[[path]]';

const env = (res: Response) => ({ ASSETS: { fetch: async () => res } });
const req = new Request('https://app.example/assets/index-old.js');

describe('hashed asset guard (Pages Function)', () => {
  it('passes real files through', async () => {
    const js = new Response('console.log(1)', {
      headers: { 'content-type': 'application/javascript' },
    });
    const out = await onRequest({ request: req, env: env(js) });
    expect(out.status).toBe(200);
    expect(await out.text()).toBe('console.log(1)');
  });
  it('turns the SPA fallback for a missing chunk into an uncached 404', async () => {
    const shell = new Response('<!doctype html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    const out = await onRequest({ request: req, env: env(shell) });
    expect(out.status).toBe(404);
    expect(out.headers.get('cache-control')).toBe('no-store');
  });
});
