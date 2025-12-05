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
        // Settlement: one person paid the other back in full
        // This balances the accounts
        if (transaction.payer === 'Adam') {
          // Adam paid Eve back
          evePaid = evePaid.plus(amount);
        } else {
          // Eve paid Adam back
          adamPaid = adamPaid.plus(amount);
        }
      }
    }

    return { adamPaid, evePaid };
  }
