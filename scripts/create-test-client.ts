import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma-node/client";
import bcrypt from "bcryptjs";

// Creates (or resets) an approved CLIENT account for testing the client portal.
// Running it again resets the password. Deactivate the account when done testing:
// it shows up in the agent's client list like any other client.

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  const email = (emailArg || "test-client@example.com").toLowerCase();
  const password = passwordArg || randomBytes(12).toString("base64url");

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const connectionString = process.env.PORTAL_DATABASE_URL;
  if (!connectionString) {
    console.error("PORTAL_DATABASE_URL is not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
    if (existing && existing.role !== "CLIENT") {
      console.error(`${email} is an ${existing.role} account; refusing to change it.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const access = {
      passwordHash,
      isActive: true,
      emailVerified: true,
      approvalStatus: "APPROVED" as const,
      mustChangePassword: false,
    };

    await prisma.user.upsert({
      where: { email },
      update: access,
      create: { email, firstName: "Test", lastName: "Client", role: "CLIENT", ...access },
    });

    console.log(`Test client ready. Sign in at /login with:\n  email:    ${email}\n  password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
