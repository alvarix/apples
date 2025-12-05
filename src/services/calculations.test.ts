import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateBalance, processTransactions } from './calculations';
import type { Transaction } from '../types/Transaction';

describe('calculateBalance', () => {
  it('should calculate balance when Adam paid more', () => {
    const adamPaid = new Decimal('100.50');
    const evePaid = new Decimal('50.25');

    const result = calculateBalance(adamPaid, evePaid);

    expect(result.adamPaid.toFixed(2)).toBe('100.50');
    expect(result.evePaid.toFixed(2)).toBe('50.25');
    expect(result.total.toFixed(2)).toBe('150.75');
    expect(result.difference.toString()).toBe('50.25');
    expect(result.owes).toEqual({
      who: 'Eve',
      whom: 'Adam',
      amount: new Decimal('25.125')
    });
  });

  it('should calculate balance when Eve paid more', () => {
    const adamPaid = new Decimal('30.00');
    const evePaid = new Decimal('70.00');

    const result = calculateBalance(adamPaid, evePaid);

    expect(result.difference.toFixed(2)).toBe('40.00');
    expect(result.owes?.who).toBe('Adam');
    expect(result.owes?.whom).toBe('Eve');
    expect(result.owes?.amount.toFixed(2)).toBe('20.00');
  });

  it('should return null owes when balanced', () => {
    const adamPaid = new Decimal('50.00');
    const evePaid = new Decimal('50.00');

    const result = calculateBalance(adamPaid, evePaid);

    expect(result.difference.toString()).toBe('0');
    expect(result.owes).toBeNull();
  });

  it('should handle decimal precision correctly', () => {
    // JavaScript would fail this: 10.1 + 20.2 = 30.299999999999997
    const adamPaid = new Decimal('10.10');
    const evePaid = new Decimal('20.20');

    const result = calculateBalance(adamPaid, evePaid);

    expect(result.total.toFixed(2)).toBe('30.30');
    expect(result.owes?.amount.toFixed(2)).toBe('5.05');
  });
});

describe('processTransactions', () => {
  it('should sum expense transactions by payer', () => {
    const transactions: Transaction[] = [
      { id: 1, description: 'Groceries', amount: '50.00', payer: 'Adam', type: 'expense', date: new Date() },
      { id: 2, description: 'Dinner', amount: '30.00', payer: 'Eve', type: 'expense', date: new Date() },
      { id: 3, description: 'Gas', amount: '25.50', payer: 'Adam', type: 'expense', date: new Date() }
    ];

    const result = processTransactions(transactions);

    expect(result.adamPaid.toFixed(2)).toBe('75.50');
    expect(result.evePaid.toFixed(2)).toBe('30.00');
  });

  it('should handle settlement transactions (full amount to one party)', () => {
    const transactions: Transaction[] = [
      { id: 1, description: 'Groceries', amount: '100.00', payer: 'Adam', type: 'expense', date: new Date() },
      { id: 2, description: 'Eve pays Adam back', amount: '50.00', payer: 'Eve', type: 'settlement', date: new Date() }
    ];

    const result = processTransactions(transactions);

    // Settlement: Eve paid Adam $50, so effectively Adam paid $50 and Eve paid $50
    expect(result.adamPaid.toFixed(2)).toBe('50.00');
    expect(result.evePaid.toFixed(2)).toBe('50.00');
  });

  it('should handle empty transaction list', () => {
    const result = processTransactions([]);

    expect(result.adamPaid.toFixed(2)).toBe('0.00');
    expect(result.evePaid.toFixed(2)).toBe('0.00');
  });
});
