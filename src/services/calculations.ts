import Decimal from 'decimal.js';
import type { Balance } from '../types/Balance';
import type { Transaction } from '../types/Transaction';

// Configure Decimal.js for currency (2 decimal places)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function calculateBalance(
  adamPaid: Decimal,
  evePaid: Decimal
): Balance {
  const total = adamPaid.plus(evePaid);
  const difference = adamPaid.minus(evePaid).abs();

  let owes: Balance['owes'] = null;

  if (!adamPaid.equals(evePaid)) {
    const amountOwed = difference.dividedBy(2);

    if (adamPaid.greaterThan(evePaid)) {
      owes = {
        who: 'Eve',
        whom: 'Adam',
        amount: amountOwed
      };
    } else {
      owes = {
        who: 'Adam',
        whom: 'Eve',
        amount: amountOwed
      };
    }
  }

  return {
    adamPaid,
    evePaid,
    total,
    difference,
    owes
  };
}

export function processTransactions(transactions: Transaction[]): {
  adamPaid: Decimal;
  evePaid: Decimal;
} {
  let adamPaid = new Decimal(0);
  let evePaid = new Decimal(0);

  for (const transaction of transactions) {
    const amount = new Decimal(transaction.amount);

    if (transaction.type === 'expense') {
      // Regular expense: split 50/50
      if (transaction.payer === 'Adam') {
        adamPaid = adamPaid.plus(amount);
      } else {
        evePaid = evePaid.plus(amount);
      }
    } else if (transaction.type === 'settlement') {
      // Settlement: one person paid the other back
      // This counts as if the receiver paid less, and the payer paid more
      // Example: Adam paid $100, Eve settles $50 to Adam
      //   - Adam gets reimbursed $50, so his net is $50
      //   - Eve paid $50 to Adam, so her net is $50
      if (transaction.payer === 'Eve') {
        // Eve paid Adam back - reduce Adam's expense, increase Eve's
        adamPaid = adamPaid.minus(amount);
        evePaid = evePaid.plus(amount);
      } else {
        // Adam paid Eve back - reduce Eve's expense, increase Adam's
        evePaid = evePaid.minus(amount);
        adamPaid = adamPaid.plus(amount);
      }
    }
  }

  return { adamPaid, evePaid };
}
