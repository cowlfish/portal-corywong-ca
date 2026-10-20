import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // pg must stay external so OpenNext resolves its workerd build (pg-cloudflare)
  serverExternalPackages: ["bcryptjs", "pg", "@prisma/adapter-pg"],
  // File tracing only follows the Node condition (empty.js); the Worker needs index.js
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pg-cloudflare/dist/**"],
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
