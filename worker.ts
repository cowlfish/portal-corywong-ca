// Custom Worker entry: OpenNext's fetch handler plus Cron Triggers.
// Cron schedules live in wrangler.jsonc (triggers.crons) and replace vercel.json.
// .open-next/ only exists after `opennextjs-cloudflare build`, which type-checks before generating it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see note above
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

const CRON_ROUTES: Record<string, string> = {
  "*/15 * * * *": "/api/cron/mls-sync",
  "0 12 * * *": "/api/cron/generate-alerts",
  "30 7 * * *": "/api/cron/mls-reconcile",
};

export default {
  fetch: handler.fetch,

  async scheduled(controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext) {
    const path = CRON_ROUTES[controller.cron];
    if (!path) {
      console.error(`No route for cron "${controller.cron}"`);
      return;
    }

    const req = new Request(new URL(path, env.NEXT_PUBLIC_APP_URL), {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const res: Response = await handler.fetch(req, env, ctx);
    const body = await res.text();
    if (!res.ok) throw new Error(`${path} failed (${res.status}): ${body}`);
    console.log(`${path} ok: ${body.slice(0, 500)}`);
  },
} satisfies ExportedHandler<CloudflareEnv>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see note above
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
