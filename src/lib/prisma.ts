import { PrismaClient } from "@prisma/client";

/** If you see pool timeouts (P2024), raise `connection_limit` / `pool_timeout` on DATABASE_URL or reduce parallel Prisma calls. */

declare global {
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
