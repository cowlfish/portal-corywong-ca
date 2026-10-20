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
| Email to Cory | Cloudflare Email Service, binding `EMAIL`, from `portal@notify.corywong.ca` (`src/lib/notify.ts`) |

## MLS sync

The TRREB IDX feed (AMPRE) is mirrored into Postgres by `src/lib/mls/sync/engine.ts`:

- **Every 15 minutes** (`/api/cron/mls-sync`): changes since the last cursor, 50 listings per page with the
  cover photo, at most 20 pages (1,000 listings) per run. The cursor is saved after each page, so a run that's
  cut off resumes where it stopped; a run that finds another still running skips.
- **Daily** (`/api/cron/mls-reconcile`): listings no longer in the feed (sold, expired, withdrawn) are marked
  `DELETED`. The IDX feed drops them rather than sending a status change.
- **Photos**: only the cover photo is stored (all ~40 per listing would be several GB). Listing pages fetch the
  full gallery from the feed live.
- **Catching up a large backlog** (more than a few thousand changes): run it from your machine instead of
  waiting for the cron to work through it at 1,000 per 15 minutes:

  ```bash
  PORTAL_DATABASE_URL=... AMPRE_API_TOKEN=... npx tsx scripts/catch-up-sync.ts
  ```

Prisma generates two clients from `prisma/schema.prisma`: `src/generated/prisma` for Workers (used by the app)
and `src/generated/prisma-node` for Node scripts. Scripts that reuse app code pass the Node client to
`setPrismaClient()` in `src/lib/db.ts`.

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

Before the first deploy, onboard `notify.corywong.ca` under **Compute > Email Service > Email Sending** in the
Cloudflare dashboard. It adds SPF, DKIM and DMARC records to that subdomain only; `corywong.ca` mail stays on
DreamHost. Until then, notifications are logged instead of sent. Email Sending needs the Workers Paid plan.
`NEXT_PUBLIC_*` values are inlined at build time, so they must be in the build environment too.
