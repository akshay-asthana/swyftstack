// Pure retry backoff — kept DB-free so it is unit-testable without Prisma.
export function backoffDelayMs(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** attempts);
}
