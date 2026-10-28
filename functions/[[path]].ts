/*
 * Cloudflare Pages Function, invoked only for hashed files (public/_routes.json: /assets/*,
 * /workbox-*). Pages' SPA mode answers a missing path with index.html (200); for a stale hashed
 * chunk that HTML would be cached as JS for a year under the immutable rule. Turn it into a 404.
 */
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const res = await env.ASSETS.fetch(request);
  if ((res.headers.get('content-type') ?? '').includes('text/html')) {
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  }
  return res;
}
