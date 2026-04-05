import { MAX_INPUT_DIGITS } from "./constants";

export function parseBigIntStrict(raw: string): bigint {
  const value = raw.trim();

  if (!/^\d+$/.test(value)) {
    throw new Error("Input must be a non-negative integer in base 10.");
  }

  const normalized = value.replace(/^0+/, "") || "0";

  if (normalized.length > MAX_INPUT_DIGITS) {
    throw new Error(`Input exceeds the maximum of ${MAX_INPUT_DIGITS} digits.`);
  }

  return BigInt(normalized);
}

export function normalizeIntegerString(raw: string): string {
  const value = raw.trim();

  if (!/^\d+$/.test(value)) {
    throw new Error("Input must be a non-negative integer in base 10.");
  }

  return value.replace(/^0+/, "") || "0";
}