# Security

Assets, controls and known gaps. Data classes are in [`data.md`](data.md).

## Assets to protect

- `DIFY_API_KEY` (bills and controls the Vera app) and `KV_REST_API_TOKEN`.
- The Vera route as a cost surface: each message is a paid model call.
- Visitor privacy: questions and IP addresses.
- The film and face images: the owner's likeness, published on purpose, served read-only.

## Controls in code

- **Secrets server-only.** Only `route.ts` and `limit.ts` read environment variables; the client
  posts to `/api/vera/chat` and never sees the key. Upstream error text is not forwarded.
- **Input limits.** Empty or non-string question → 400; more than 1,000 characters → 413.
- **Rate limit.** 10 messages per visitor per 24 h; 429 with `Retry-After`. Durable in Upstash
  when configured, otherwise per server instance (a cold start or another instance resets it).
- **IP minimisation.** Only `sha256(ip)` truncated to 32 hex chars is stored.
- **Headers** (`next.config.mjs`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone,
  geolocation off), HSTS with preload, and a CSP with `default-src 'self'`, `connect-src 'self'`,
  `frame-ancestors 'none'`.
- **No identity.** There is no login, role or session; nothing to authorise.

## Secret scan

`scripts/secret-scan.mjs` refuses secrets (token formats, private keys, JSON Web Tokens, database URLs with a
password, filled secrets in configuration files) and local data files (env files, keys, databases, dumps). CI runs
it over every tracked file in the Lint job. To run it before each commit on your own clone, once:
`git config core.hooksPath .githooks`. It never prints the value it found. A deliberate, harmless example line can
carry the marker `secret-scan:allow`.

## Known gaps and risks

- The CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts (Next.js and GSAP inline needs).
- The client IP comes from `x-forwarded-for`; outside Vercel it can be spoofed, weakening the limit.
- The `user` field from the browser is forwarded to Dify unchanged (default
  `sentraverse-neural-visitor`).
- `scripts/deploy-dry-run.mjs` has `SERVER_ONLY = []`, so it does not check that `DIFY_API_KEY`
  or `KV_REST_API_TOKEN` stay out of the client bundle; its comment predates Vera. Fixing it is a
  code change (R2), not done here.
- The `next.config.mjs` header comment still says "No rewrites, no environment".
- Vera's answers come from the external Dify app; see [`regulatory-safety.md`](regulatory-safety.md).

## Incident handling

1. Key leaked or abused: rotate `DIFY_API_KEY` in Dify, update it in Vercel (Production,
   sensitive), redeploy. Gaffer owns both consoles (R3: credentials).
2. Cost spike: lower the Dify app quota or remove the key in Vercel; the page keeps working.
3. Report security issues to the owner, Gaffer; never in a public issue.
