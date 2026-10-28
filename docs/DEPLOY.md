# Deploying the PWA (Cloudflare Pages)

Decided in the backend repo: D-040 / D-041 / D-042, `atp-backend/docs/DEPLOY.md` §3.

**Live since 2026-10-27:** Pages project `atp-ui` → `https://money.atprehab.si` (branch `production`, API `https://api.atprehab.si`). Production only: preview deployments are off and there is no staging API (D-042); the staging row below is the original plan. All checks under "After the first deploy" passed on `money.atprehab.si`.

## Environments

| Pages environment | Git branch                      | URL                        | API (`VITE_API_URL`)           |
| ----------------- | ------------------------------- | -------------------------- | ------------------------------ |
| Production        | `production`                    | `https://app.<domain>`     | `https://api.<domain>`         |
| Preview (staging) | `main` (branch alias `staging`) | `https://staging.<domain>` | `https://api-staging.<domain>` |

Promote `main` → `production` with a reviewed PR, like the backend.

## Pages project settings

- Git integration on `animeshdesh/ATP-UI`, root directory `/`, production branch `production`.
- Build command `pnpm --filter money build`, output directory `apps/money/dist` (pnpm workspace since F5; `pnpm install` runs at the root). The patients app gets its own project (`atp-patients`, `pnpm --filter patients build`, `apps/patients/dist`).
- Set `NODE_VERSION=24` and `PNPM_VERSION=12.10.1` as Pages environment variables in both environments (don't rely on the build image honouring `.nvmrc` / `packageManager`). Confirm both versions in the first build log.
- Environment variables, per environment (all public, plain variables):
  - `VITE_API_URL`: absolute https URL from the table above
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: that environment's Supabase project (Singapore)
  - Optional `VITE_PHONE_AUTH=true` (phone + password sign-in and phone invites; needs a Supabase SMS provider) and `VITE_MAGIC_LINK=true` (needs Supabase SMTP). Unset = off: sign-in is email + password, and accounts come from invites or `bootstrap-clinic`.

`apps/<app>/vite.config.ts` fails the build when any of these is missing, when `VITE_API_URL` isn't absolute https, or when `VITE_AUTH=mock`, so mock auth can never ship. Preview builds of other branches also use the Preview (staging) variables.

## What ships with `apps/<app>/dist/`

- `_headers` (from `public/`): `/assets/*` and `/workbox-*` → `public, max-age=31536000, immutable`; everything else → `no-cache` (index.html, sw.js, registerSW.js, manifest, icons, SVGs), plus `nosniff` and `Referrer-Policy`.
- `_routes.json` (from `public/`): runs the Pages Function only on `/assets/*` and `/workbox-*`.
- `functions/[[path]].ts`: Pages' SPA mode answers a missing path with `index.html` (200). For a stale hashed chunk (old tab after a deploy), the function returns a `no-store` 404 instead, so HTML is never cached as JS. Unit-tested in `functions/hashed-assets.test.ts`.
- No `404.html` and no `_redirects`: client routes (`/transactions`, `/invite/<token>`) get the app shell from SPA mode.
- The MSW dev worker is removed from deployed builds.

## After the first deploy, check

```sh
curl -sI https://staging.<domain>/ | grep -i cache-control            # no-cache
curl -sI https://staging.<domain>/assets/<a real file> | grep -i cache  # immutable
curl -sI https://staging.<domain>/workbox-<hash>.js | grep -i cache    # immutable (else move workbox under /assets via the PWA plugin)
curl -sI https://staging.<domain>/assets/missing.js                     # 404, no-store
curl -sI https://staging.<domain>/invite/abc                            # 200 (app shell)
```

Supabase Auth must list `https://app.<domain>` / `https://staging.<domain>` as Site URL and redirect URLs (magic links and invites); the API's `CORS_ORIGINS` must include them.
