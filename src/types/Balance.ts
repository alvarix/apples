import Decimal from "decimal.js";
import type { Payer } from "./Payer";

export interface Balance {
  adamPaid: Decimal;
  evePaid: Decimal;
  total: Decimal;
  difference: Decimal;
  owes: {
    who: Payer;
    whom: Payer;
    amount: Decimal;
  } | null;
}

export interface MonthlyBalance extends Balance {
  month: string; // YYYY-MM format
}
