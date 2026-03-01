import { Participant, Transfer } from '../types';

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Settlement algorithm: computes transfers to settle all debts using random pairing.
 * 
 * Input: list of participants with amounts
 * - amount > 0: creditor (should receive money)
 * - amount < 0: debtor (owes money)
 * 
 * Output: list of transfers { from, to, amount }
 */
export function computeSettlement(participants: Participant[]): Transfer[] {
  // Ensure participants is an array
  if (!Array.isArray(participants) || participants.length === 0) {
    return [];
  }

  // Filter out zero balances and separate into creditors and debtors
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const p of participants) {
    if (p.amount > 0.01) {
      creditors.push({ name: p.name, amount: p.amount });
    } else if (p.amount < -0.01) {
      debtors.push({ name: p.name, amount: Math.abs(p.amount) });
    }
  }

  // Shuffle randomly for varied settlement pairings
  shuffle(creditors);
  shuffle(debtors);

  const transfers: Transfer[] = [];
  let transferId = 1;

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0.01) {
      transfers.push({
        id: `transfer-${transferId++}`,
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(transferAmount * 100) / 100, // Round to 2 decimals
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    // Move to next creditor/debtor if balance is settled
    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transfers;
}

/**
 * Validate that total credits equal total debits
 */
export function validateBalances(participants: Participant[]): { valid: boolean; sum: number } {
  if (!Array.isArray(participants) || participants.length === 0) {
    return { valid: false, sum: 0 };
  }
  const sum = participants.reduce((acc, p) => acc + p.amount, 0);
  return {
    valid: Math.abs(sum) < 0.01,
    sum: Math.round(sum * 100) / 100,
  };
}
