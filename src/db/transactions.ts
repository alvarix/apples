import { query } from './connection';
import type { Transaction, NewTransaction } from '../types/Transaction';
import { isValidPayer } from '../types/Payer';
import { isValidTransactionType } from '../types/Transaction';

interface DbTransaction {
  id: number;
  description: string;
  amount: string;
  payer: string;
  date: Date;
  type: string;
}

export async function insertTransaction(
  transaction: NewTransaction,
  tableName: string = 'transactions'
): Promise<Transaction> {
  if (!isValidPayer(transaction.payer)) {
    throw new Error(`Invalid payer: ${transaction.payer}`);
  }

  if (!isValidTransactionType(transaction.type)) {
    throw new Error(`Invalid transaction type: ${transaction.type}`);
  }

  const result = await query<DbTransaction>(
    `INSERT INTO ${tableName} (description, amount, payer, type, date)
     VALUES ($1, $2::numeric, $3, $4, $5)
     RETURNING id, description, amount::text, payer, date, type`,
    [
      transaction.description,
      transaction.amount,
      transaction.payer,
      transaction.type,
      transaction.date || new Date()
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    payer: row.payer as any,
    date: row.date,
    type: row.type as any
  };
}

export async function getTransactions(
  tableName: string = 'transactions',
  startDate?: Date,
  endDate?: Date
): Promise<Transaction[]> {
  let queryText = `
    SELECT id, description, amount::text, payer, date, type
    FROM ${tableName}
  `;
  const params: any[] = [];

  if (startDate && endDate) {
    queryText += ' WHERE date >= $1 AND date < $2';
    params.push(startDate, endDate);
  }

  queryText += ' ORDER BY date DESC, id DESC';

  const result = await query<DbTransaction>(queryText, params);

  return result.rows.map(row => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    payer: row.payer as any,
    date: row.date,
    type: row.type as any
  }));
}

export async function deleteTransaction(
  id: number,
  tableName: string = 'transactions'
): Promise<void> {
  await query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
}

export async function getMonthTransactions(
  year: number,
  month: number,
  tableName: string = 'transactions'
): Promise<Transaction[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return getTransactions(tableName, startDate, endDate);
}
