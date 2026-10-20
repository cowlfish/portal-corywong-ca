# portal.corywong.ca

Client portal for Cory Wong Real Estate: Next.js 16 + Prisma (Neon Postgres), running on
Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare).

## How it runs

| Piece | Where |
|---|---|
| App | Worker `portal-corywong-ca` (`wrangler.jsonc`, entry `worker.ts`) |
| Database | Neon Postgres through Hyperdrive binding `HYPERDRIVE` (`src/lib/db.ts`) |
| Documents | R2 bucket `portal-corywong-ca-documents`, binding `DOCUMENTS` (`src/lib/encryption.ts`) |
| Next cache | R2 bucket `portal-corywong-ca-opennext-cache` |
| Cron | Cron Triggers in `wrangler.jsonc`; `worker.ts` maps each to its `/api/cron/*` route |

## RECO compliance

See [docs/RECO-COMPLIANCE.md](docs/RECO-COMPLIANCE.md). `npm run build` runs `npm run check:reco` first.

## Development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in secrets
npm run dev                      # next dev, with Cloudflare bindings
npm run preview                  # build and run the real Worker locally
```

For a database locally, set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (or edit
`localConnectionString` in `wrangler.jsonc`). Prisma CLI and scripts still read `PORTAL_DATABASE_URL`
from `.env`.

After changing `wrangler.jsonc`, run `npm run cf-typegen`.

## Deploy

```bash
npm run deploy
```

Secrets are set once per name with `npx wrangler secret put <NAME>` (see `.dev.vars.example`).
`NEXT_PUBLIC_*` values are inlined at build time, so they must be in the build environment too.
