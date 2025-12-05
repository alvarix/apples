export type Payer = "Adam" | "Eve";

export function isValidPayer(value: unknown): value is Payer {
  return value === "Adam" || value === "Eve";
}
