import { describe, it, expect } from "vitest";
import { isValidPayer, type Payer } from "./Payer";

describe("Payer", () => {
  it("should validate Adam as valid payer", () => {
    expect(isValidPayer("Adam")).toBe(true);
  });

  it("should validate Eve as valid payer", () => {
    expect(isValidPayer("Eve")).toBe(true);
  });

  it("should reject invalid payer names", () => {
    expect(isValidPayer("Bob")).toBe(false);
    expect(isValidPayer("")).toBe(false);
    expect(isValidPayer(null)).toBe(false);
    expect(isValidPayer(undefined)).toBe(false);
  });
});
