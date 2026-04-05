import { SMALL_PRIMES } from "./constants";

export type SmallPrimeFilterResult =
  | { kind: "small-prime"; prime: bigint }
  | { kind: "composite"; divisor: bigint }
  | { kind: "pass" };

export function runSmallPrimeFilters(n: bigint): SmallPrimeFilterResult {
  for (const p of SMALL_PRIMES) {
    if (n === p) {
      return { kind: "small-prime", prime: p };
    }

    if (n % p === 0n) {
      return { kind: "composite", divisor: p };
    }
  }

  return { kind: "pass" };
}