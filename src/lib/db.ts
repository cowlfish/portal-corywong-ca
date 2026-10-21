import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString, max: 5 });
  return new PrismaClient({ adapter });
}

// On Workers, a pg connection opened in one request can't be reused by another,
// so each request gets its own client (keyed on its ExecutionContext) backed by
// Hyperdrive, which does the real pooling in front of Neon.
const perRequest = new WeakMap<object, PrismaClient>();

// Scripts, seeds and plain `next dev` have no Cloudflare context and use the env var.
let nodeClient: PrismaClient | undefined;

// The app's client is built for Workers (its query compiler is a .wasm module import), which
// Node can't load. Node scripts that reuse app code (e.g. the MLS sync engine) pass in a
// client generated for Node from the same schema (src/generated/prisma-node).
export function setPrismaClient(client: unknown) {
  nodeClient = client as PrismaClient;
}

function getPrisma(): PrismaClient {
  let ctx: { env: CloudflareEnv; ctx: object } | undefined;
  try {
    ctx = getCloudflareContext();
  } catch {
    ctx = undefined;
  }

  if (ctx?.env.HYPERDRIVE) {
    let client = perRequest.get(ctx.ctx);
    if (!client) {
      client = createPrismaClient(ctx.env.HYPERDRIVE.connectionString);
      perRequest.set(ctx.ctx, client);
    }
    return client;
  }

  if (!nodeClient) {
    const connectionString = process.env.PORTAL_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("PORTAL_DATABASE_URL is not set");
    nodeClient = createPrismaClient(connectionString);
  }
  return nodeClient;
}

// Keeps the existing `import { prisma }` call sites working unchanged.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
