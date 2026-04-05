import { normalizeIntegerString, parseBigIntStrict } from "./parse";
import { runSmallPrimeFilters } from "./small-prime-filters";
import { getBitLength } from "./bit-length";
import { getTargetRounds } from "./round-policy";
import {
  isDeterministicPrime64,
  runProbabilisticMillerRabin,
} from "./miller-rabin";

const UINT64_MAX = 18446744073709551615n;

export type PrimeCheckResponse =
  | {
      input: string;
      normalized: string;
      classification: "prime";
      isPrime: true;
      method: "trivial" | "deterministic-mr-64";
      elapsedMs: number;
      completedRounds: number;
      bitLength: number;
      targetRounds: number;
      rejectedBySmallPrime?: undefined;
    }
  | {
      input: string;
      normalized: string;
      classification: "composite";
      isPrime: false;
      method: "trivial" | "small-prime-filter" | "deterministic-mr-64" | "miller-rabin";
      elapsedMs: number;
      completedRounds: number;
      bitLength: number;
      targetRounds: number;
      rejectedBySmallPrime?: string;
    }
  | {
      input: string;
      normalized: string;
      classification: "probably_prime" | "inconclusive_timeout";
      isPrime: null;
      method: "miller-rabin";
      elapsedMs: number;
      completedRounds: number;
      bitLength: number;
      targetRounds: number;
      rejectedBySmallPrime?: undefined;
    };

export function checkPrime(
  rawInput: string,
  timeoutMs: number
): PrimeCheckResponse {
  const startedAt = Date.now();

  const normalized = normalizeIntegerString(rawInput);
  const n = parseBigIntStrict(rawInput);
  const bitLength = getBitLength(n);

  if (n < 2n) {
    return {
      input: rawInput,
      normalized,
      classification: "composite",
      isPrime: false,
      method: "trivial",
      elapsedMs: Date.now() - startedAt,
      completedRounds: 0,
      bitLength,
      targetRounds: 0,
    };
  }

  const smallPrimeResult = runSmallPrimeFilters(n);

  if (smallPrimeResult.kind === "small-prime") {
    return {
      input: rawInput,
      normalized,
      classification: "prime",
      isPrime: true,
      method: "trivial",
      elapsedMs: Date.now() - startedAt,
      completedRounds: 0,
      bitLength,
      targetRounds: 0,
    };
  }

  if (smallPrimeResult.kind === "composite") {
    return {
      input: rawInput,
      normalized,
      classification: "composite",
      isPrime: false,
      method: "small-prime-filter",
      elapsedMs: Date.now() - startedAt,
      completedRounds: 0,
      bitLength,
      targetRounds: 0,
      rejectedBySmallPrime: smallPrimeResult.divisor.toString(),
    };
  }

  if (n <= UINT64_MAX) {
    const isPrime = isDeterministicPrime64(n);

    return {
      input: rawInput,
      normalized,
      classification: isPrime ? "prime" : "composite",
      isPrime,
      method: "deterministic-mr-64",
      elapsedMs: Date.now() - startedAt,
      completedRounds: 0,
      bitLength,
      targetRounds: 0,
    };
  }

  const targetRounds = getTargetRounds(bitLength);
  const mrResult = runProbabilisticMillerRabin(n, targetRounds, timeoutMs);

  if (mrResult.classification === "composite") {
    return {
      input: rawInput,
      normalized,
      classification: "composite",
      isPrime: false,
      method: "miller-rabin",
      elapsedMs: mrResult.elapsedMs,
      completedRounds: mrResult.completedRounds,
      bitLength,
      targetRounds,
    };
  }

  return {
    input: rawInput,
    normalized,
    classification: mrResult.classification,
    isPrime: null,
    method: "miller-rabin",
    elapsedMs: mrResult.elapsedMs,
    completedRounds: mrResult.completedRounds,
    bitLength,
    targetRounds,
  };
}