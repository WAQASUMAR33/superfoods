import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

function makePrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });
}

export const prisma: PrismaClient =
  globalThis._prisma ?? (globalThis._prisma = makePrisma());
