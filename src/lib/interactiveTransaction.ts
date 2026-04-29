/**
 * Prisma interactive `$transaction(async (tx) => …)` defaults are maxWait 2s / timeout 5s.
 * Sales, purchases, and journal entries over a remote DB often exceed that — raises P2028.
 */
export const interactiveTransactionOptions = {
  /** ms to wait to acquire a connection from the pool */
  maxWait: 15_000,
  /** ms the callback may run before the transaction is cancelled */
  timeout: 30_000,
} as const;
