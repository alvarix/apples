import type { Payer } from "./Payer";

export type TransactionType = "expense" | "loan" | "settlement";

export interface Transaction {
  id: number;
  description: string;
  amount: string; // Stored as string to preserve decimal precision
  payer: Payer;
  date: Date;
  type: TransactionType;
}

export interface NewTransaction {
  description: string;
  amount: string;
  payer: Payer;
  type: TransactionType;
  date?: Date;
}

export function isValidTransactionType(
  value: unknown,
): value is TransactionType {
  return value === "expense" || value === "loan" || value === "settlement";
}
