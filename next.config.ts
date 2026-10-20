import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // pg must stay external so OpenNext resolves its workerd build (pg-cloudflare)
  serverExternalPackages: ["bcryptjs", "pg", "@prisma/adapter-pg"],
  // File tracing only follows the Node condition (empty.js); the Worker needs index.js
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pg-cloudflare/dist/**"],
  },
  // The Prisma client imports its query compiler as a .wasm module on Workers, and the
  // bundler then picks up every .wasm under node_modules. Only the Postgres compiler (copied
  // into src/generated/prisma) is used; the CLI, its embedded Postgres and the other
  // databases' compilers add ~15 MB.
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/prisma/**",
      "./node_modules/@prisma/dev/**",
      "./node_modules/@electric-sql/**",
      "./node_modules/@prisma/client/runtime/*.wasm*",
      "./node_modules/@prisma/client/runtime/*sqlite*",
      "./node_modules/@prisma/client/runtime/*mysql*",
      "./node_modules/@prisma/client/runtime/*sqlserver*",
      "./node_modules/@prisma/client/runtime/*cockroachdb*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

// Exposes wrangler.jsonc bindings (Hyperdrive, R2) to `next dev`
initOpenNextCloudflareForDev();
