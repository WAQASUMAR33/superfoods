/**
 * Party ledger line effect on running balance — must match `updatePartyLedger` in `double-entry.ts`
 * (DEBIT adds, CREDIT subtracts).
 */
export function partyLedgerLineDelta(type: string, amount: number): number {
  const t = String(type).toUpperCase();
  if (t === "DEBIT") return amount;
  if (t === "CREDIT") return -amount;
  return 0;
}

/** Running balance immediately before this line is applied. */
export function partyLedgerPreBalance(type: string, amount: number, runningBalance: number): number {
  return runningBalance - partyLedgerLineDelta(type, amount);
}

export function partyLedgerDebitCreditAmounts(type: string, amount: number): { debit: number; credit: number } {
  const t = String(type).toUpperCase();
  if (t === "DEBIT") return { debit: amount, credit: 0 };
  if (t === "CREDIT") return { debit: 0, credit: amount };
  return { debit: 0, credit: 0 };
}
