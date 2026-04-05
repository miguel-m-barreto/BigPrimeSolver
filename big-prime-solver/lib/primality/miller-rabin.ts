import { randomBytes } from "node:crypto";
import { DETERMINISTIC_64BIT_BASES } from "./constants";
import { modPow } from "./mod-pow";

function decompose(n: bigint): { d: bigint; r: number } {
  let d = n - 1n;
  let r = 0;

  while ((d & 1n) === 0n) {
    d >>= 1n;
    r++;
  }

  return { d, r };
}

function isWitness(a: bigint, n: bigint, d: bigint, r: number): boolean {
  let x = modPow(a, d, n);

  if (x === 1n || x === n - 1n) {
    return false;
  }

  for (let i = 1; i < r; i++) {
    x = (x * x) % n;

    if (x === n - 1n) {
      return false;
    }
  }

  return true;
}

function randomBigIntBetween(min: bigint, max: bigint): bigint {
  if (max < min) {
    throw new Error("Invalid random range.");
  }

  const range = max - min + 1n;
  const bitLength = range.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);

  while (true) {
    const bytes = randomBytes(byteLength);
    let candidate = 0n;

    for (const byte of bytes) {
      candidate = (candidate << 8n) | BigInt(byte);
    }

    if (candidate < range) {
      return min + candidate;
    }
  }
}

export function isDeterministicPrime64(n: bigint): boolean {
  if (n < 2n) {
    return false;
  }

  const { d, r } = decompose(n);

  for (const a of DETERMINISTIC_64BIT_BASES) {
    if (a >= n) {
      continue;
    }

    if (isWitness(a, n, d, r)) {
      return false;
    }
  }

  return true;
}

export type ProbabilisticMrResult =
  | {
      classification: "composite";
      isPrime: false;
      completedRounds: number;
      elapsedMs: number;
    }
  | {
      classification: "probably_prime";
      isPrime: null;
      completedRounds: number;
      elapsedMs: number;
    }
  | {
      classification: "inconclusive_timeout";
      isPrime: null;
      completedRounds: number;
      elapsedMs: number;
    };

export function runProbabilisticMillerRabin(
  n: bigint,
  targetRounds: number,
  timeoutMs: number
): ProbabilisticMrResult {
  if (n < 2n) {
    return {
      classification: "composite",
      isPrime: false,
      completedRounds: 0,
      elapsedMs: 0,
    };
  }

  const startedAt = Date.now();
  const { d, r } = decompose(n);

  let completedRounds = 0;

  for (let i = 0; i < targetRounds; i++) {
    const now = Date.now();
    const elapsedMs = now - startedAt;

    if (elapsedMs >= timeoutMs) {
      return {
        classification: "inconclusive_timeout",
        isPrime: null,
        completedRounds,
        elapsedMs,
      };
    }

    const a = randomBigIntBetween(2n, n - 2n);

    if (isWitness(a, n, d, r)) {
      return {
        classification: "composite",
        isPrime: false,
        completedRounds,
        elapsedMs: Date.now() - startedAt,
      };
    }

    completedRounds++;
  }

  return {
    classification: "probably_prime",
    isPrime: null,
    completedRounds,
    elapsedMs: Date.now() - startedAt,
  };
}