# Runbook

Operating the site day to day. Failure signatures are in [`troubleshooting.md`](troubleshooting.md);
the release path is in [`deployment.md`](deployment.md).

## Ownership

- Owner and only approver for production, credentials and publication: Gaffer (dr. Ferdi Iskandar).
- Production host: Vercel project `sentraverseii` (`https://sentraverseii.vercel.app/` public;
  per-deployment URLs require Vercel login).
- External services: Dify (Vera answers), Upstash Redis from the Vercel Marketplace (limit store).

## Start and stop locally

```bash
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run start          # 127.0.0.1:4346, stop with Ctrl+C
```

Production has nothing to start: Vercel serves the latest production deployment.

## Routine checks

| Check | How | Healthy |
| --- | --- | --- |
| Page up | Open the production URL | HTTP 200, the first chapter visible |
| Film frames | Scroll to THE LEGACY | 120 frames arrive (e2e "the film is fetched only on the way") |
| Vera | Ask one question | Streamed answer; not "Vera is not available right now." |
| Limit | 11th message from one visitor in 24 h | 429 with a limit message |

## Operational tasks

- **Disable Vera fast:** remove or blank `DIFY_API_KEY` in Vercel and redeploy; the route then
  returns 500 and the page keeps working. Restore by setting the key again.
- **Rotate a key:** create the new key in Dify (or Upstash), update Vercel env (sensitive,
  Production and Preview as needed), redeploy, revoke the old key.
- **Reset a visitor's limit:** delete the `vera:msgs:<hash>` key in Upstash, or wait for the 24 h TTL.
- **Replace the film:** export to a new version folder and change `FILM.version`; never edit `v1`.
- **Roll back:** promote the previous production deployment in Vercel (see [`deployment.md`](deployment.md)).

## Escalation

Anything touching production, credentials, deployments or clinical messaging is R3 and needs
Gaffer's explicit approval first (monorepo `AGENTS.md`). Agents prepare the change and report.
