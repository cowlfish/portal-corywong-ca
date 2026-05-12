import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const agentExists = await prisma.user.findUnique({
    where: { email: "cory@corywong.ca" },
  });

  if (!agentExists) {
    const passwordHash = await bcrypt.hash("changeme123", 12);
    await prisma.user.create({
      data: {
        email: "cory@corywong.ca",
        passwordHash,
        firstName: "Cory",
        lastName: "Wong",
        role: "AGENT",
        emailVerified: true,
        isActive: true,
        mustChangePassword: true,
      },
    });
    console.log("Created agent user: cory@corywong.ca");
  } else {
    console.log("Agent user already exists");
  }

  const demoClientExists = await prisma.user.findUnique({
    where: { email: "demo-client@example.com" },
  });

  if (!demoClientExists) {
    const passwordHash = await bcrypt.hash("changeme123", 12);
    await prisma.user.create({
      data: {
        email: "demo-client@example.com",
        passwordHash,
        firstName: "Demo",
        lastName: "Client",
        role: "CLIENT",
        emailVerified: true,
        isActive: true,
      },
    });
    console.log("Created demo client user: demo-client@example.com");
  } else {
    console.log("Demo client user already exists");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
