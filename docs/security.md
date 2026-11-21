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

`scripts/secret-scan.mjs` needs only Node and Git and never prints the value it found.

- **Refuses:** known token formats (Dify, OpenAI and OpenRouter, Anthropic, Clerk and Stripe secret keys, Resend,
  Supabase, GitHub, npm, AWS, Google, Slack, webhook signing secrets, JSON Web Tokens), private keys, URLs that carry
  a password, filled secrets in configuration files (a name ending in `KEY`, `TOKEN`, `SECRET`, `PASSWORD` or
  `PASSCODE`), database dumps by their header, and by name: env files, key files, databases and data exports
  (spreadsheets, CSV and similar).
- **Cannot do:** tell real data from sample data inside an ordinary text, JSON or SQL file, or recognise a secret
  that has no known shape. It is a net, not a proof; review still decides.
- **When it runs:** the CI Lint job runs it first, over every tracked file, on each push; that is after the push is
  already public. To stop a secret before it leaves your machine, activate the hook once per clone:
  `git config core.hooksPath .githooks`. Inside the monorepo, leave its own hooks path alone and call the script
  from there.
- **Exceptions are visible:** a line may end with a comment holding `secret-scan:allow`; a tracked
  `.secret-scan-allow` file may list exact paths or folders ending in `/`. Env files can never be listed. Every
  exception used is counted in the output.

For blocking at GitHub itself, turn on secret scanning push protection in the repository settings; that is the
owner's switch and is independent of this script.

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
