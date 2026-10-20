// Minimal Workers runtime types for the bindings this app uses.
// The full runtime types (wrangler types / @cloudflare/workers-types) replace the
// DOM fetch types globally (e.g. Response.json() becomes Promise<unknown>), which
// breaks client components, so cf-typegen runs with --include-runtime=false.

interface Hyperdrive {
  readonly connectionString: string;
}

interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2Bucket {
  put(key: string, value: ArrayBuffer | ArrayBufferView | string | null): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Service<T = unknown> = Fetcher;

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
  noRetry(): void;
}

interface ExportedHandler<Env = unknown> {
  fetch?(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
  scheduled?(controller: ScheduledController, env: Env, ctx: ExecutionContext): void | Promise<void>;
}

// Cloudflare Email Service send binding (structured form)
interface EmailAddress {
  email: string;
  name?: string;
}

interface SendEmail {
  send(message: {
    to: string | EmailAddress | (string | EmailAddress)[];
    from: string | EmailAddress;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | EmailAddress;
  }): Promise<{ messageId: string }>;
}
