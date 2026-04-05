"use client";

import { FormEvent, useMemo, useState } from "react";

type PrimeApiResponse = {
  input: string;
  normalized: string;
  classification: "prime" | "composite" | "probably_prime" | "inconclusive_timeout";
  isPrime: true | false | null;
  method: "trivial" | "small-prime-filter" | "deterministic-mr-64" | "miller-rabin";
  elapsedMs: number;
  completedRounds: number;
  bitLength: number;
  targetRounds: number;
  rejectedBySmallPrime?: string;
  cached?: boolean;
  error?: string;
};

const EXAMPLE_NUMBERS = [
  "2",
  "17",
  "221",
  "1000000007",
  "18446744073709551557",
  "170141183460469231731687303715884105727",
];

const TIMEOUT_OPTIONS = [
  { label: "2 seconds", value: 2000 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds", value: 10000 },
  { label: "30 seconds", value: 30000 },
  { label: "1 minute", value: 60000 },
  { label: "5 minutes", value: 300000 },
  { label: "30 minutes", value: 1800000 },
];

function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }

  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

function getClassificationLabel(
  classification: PrimeApiResponse["classification"]
): string {
  switch (classification) {
    case "prime":
      return "Prime";
    case "composite":
      return "Composite";
    case "probably_prime":
      return "Probably prime";
    case "inconclusive_timeout":
      return "Inconclusive (timed out)";
    default:
      return "Unknown";
  }
}

function getMethodLabel(method: PrimeApiResponse["method"]): string {
  switch (method) {
    case "trivial":
      return "Trivial check";
    case "small-prime-filter":
      return "Small-prime filter";
    case "deterministic-mr-64":
      return "Deterministic Miller-Rabin (64-bit)";
    case "miller-rabin":
      return "Miller-Rabin";
    default:
      return method;
  }
}

function getResultAccentClasses(
  classification: PrimeApiResponse["classification"]
): string {
  switch (classification) {
    case "prime":
      return "border-emerald-700 bg-emerald-950/30 text-emerald-300";
    case "composite":
      return "border-red-800 bg-red-950/30 text-red-300";
    case "probably_prime":
      return "border-amber-700 bg-amber-950/30 text-amber-300";
    case "inconclusive_timeout":
      return "border-yellow-700 bg-yellow-950/30 text-yellow-300";
    default:
      return "border-zinc-700 bg-zinc-950 text-zinc-300";
  }
}

function getInterpretation(result: PrimeApiResponse): string {
  switch (result.classification) {
    case "prime":
      return "This value was determined to be prime with certainty in the supported deterministic path.";
    case "composite":
      return result.rejectedBySmallPrime
        ? `This value is definitely composite. It was rejected immediately because it is divisible by ${result.rejectedBySmallPrime}.`
        : "This value is definitely composite.";
    case "probably_prime":
      return `This value passed ${result.completedRounds} Miller-Rabin rounds out of the target ${result.targetRounds}. That is strong evidence, but it is not a formal proof of primality.`;
    case "inconclusive_timeout":
      return `The computation timed out after ${formatMs(result.elapsedMs)}. The number passed ${result.completedRounds} Miller-Rabin rounds out of the target ${result.targetRounds}, but no final conclusion was reached in time.`;
    default:
      return "No interpretation available.";
  }
}

export default function HomePage() {
  const [number, setNumber] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrimeApiResponse | null>(null);
  const [requestError, setRequestError] = useState("");

  const normalizedInputPreview = useMemo(() => {
    const trimmed = number.trim();

    if (!trimmed) {
      return "";
    }

    if (!/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    return trimmed.replace(/^0+/, "") || "0";
  }, [number]);

  const digitCount = useMemo(() => {
    if (!normalizedInputPreview || !/^\d+$/.test(normalizedInputPreview)) {
      return 0;
    }

    return normalizedInputPreview.length;
  }, [normalizedInputPreview]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!number.trim()) {
      setRequestError("Please enter an integer.");
      setResult(null);
      return;
    }

    setLoading(true);
    setRequestError("");
    setResult(null);

    try {
      const response = await fetch("/api/prime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          timeoutMs,
        }),
      });

      const data = (await response.json()) as PrimeApiResponse;

      if (!response.ok) {
        setRequestError(data.error ?? "Request failed.");
        return;
      }

      setResult(data);
    } catch {
      setRequestError("Network error while checking primality.");
    } finally {
      setLoading(false);
    }
  }

  function handleExampleClick(value: string) {
    setNumber(value);
    setResult(null);
    setRequestError("");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="mb-10">
          <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            BigPrimeSolver
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Check whether a huge integer is actually prime
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            This tool first rejects obvious composites with small-prime filters, then
            applies deterministic Miller-Rabin for supported 64-bit values, and
            probabilistic Miller-Rabin for larger integers. For large values, a result
            of <span className="font-semibold text-zinc-200">probably prime</span> is
            strong evidence, not a formal proof.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-sm font-semibold text-zinc-100">Composite</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                This is certain. If a witness is found or a small divisor exists, the
                number is definitely not prime.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-sm font-semibold text-zinc-100">Probably prime</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                The number passed the planned Miller-Rabin rounds, but no formal proof
                of primality has been produced yet.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-sm font-semibold text-zinc-100">Inconclusive</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                The timeout was reached before the planned Miller-Rabin schedule was
                completed.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="prime-number"
                  className="mb-2 block text-sm font-semibold text-zinc-200"
                >
                  Integer input
                </label>

                <textarea
                  id="prime-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter a positive integer in base 10..."
                  rows={8}
                  spellCheck={false}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/40"
                />

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>Normalized digits: {digitCount}</span>
                  {normalizedInputPreview && /^\d+$/.test(normalizedInputPreview) && (
                    <span className="max-w-full truncate">
                      Normalized preview:{" "}
                      <span className="font-mono text-zinc-400">
                        {normalizedInputPreview}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                <div>
                  <label
                    htmlFor="timeout"
                    className="mb-2 block text-sm font-semibold text-zinc-200"
                  >
                    Timeout
                  </label>

                  <select
                    id="timeout"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/40"
                  >
                    {TIMEOUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                    The server will run the primality pipeline until it reaches a final
                    deterministic result, the planned Miller-Rabin target, or the
                    selected timeout.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading || !number.trim()}
                  className="inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Checking..." : "Check primality"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNumber("");
                    setTimeoutMs(5000);
                    setResult(null);
                    setRequestError("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <aside className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-zinc-100">Quick examples</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Use these values to test the new classification flow.
            </p>

            <div className="mt-5 space-y-2">
              {EXAMPLE_NUMBERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleExampleClick(value)}
                  className="block w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left font-mono text-xs text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <span className="block truncate">{value}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              <div className="font-semibold text-zinc-200">Execution pipeline</div>
              <div className="mt-2 space-y-1">
                <p>1. Input normalization and validation</p>
                <p>2. Small-prime filters</p>
                <p>3. Deterministic MR for 64-bit integers</p>
                <p>4. Probabilistic MR with automatic target rounds</p>
                <p>5. Timeout-aware classification</p>
                <p>6. Result caching by certainty level</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Result</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Honest output. No fake certainty.
              </p>
            </div>
          </div>

          {requestError && (
            <div className="mt-5 rounded-2xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {requestError}
            </div>
          )}

          {!requestError && !loading && !result && (
            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
              No result yet. Submit a number to start.
            </div>
          )}

          {loading && (
            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-400">
              Running primality pipeline...
            </div>
          )}

          {result && !result.error && (
            <div className="mt-5 space-y-5">
              <div
                className={`rounded-2xl border px-5 py-4 ${getResultAccentClasses(
                  result.classification
                )}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-bold">
                      {getClassificationLabel(result.classification)}
                    </div>
                    <div className="mt-1 text-sm opacity-90">
                      {result.classification === "prime" &&
                        "The input was determined to be prime with certainty in the deterministic path."}
                      {result.classification === "composite" &&
                        "The input was determined to be composite."}
                      {result.classification === "probably_prime" &&
                        "The input passed the planned Miller-Rabin schedule, but primality is not formally proven."}
                      {result.classification === "inconclusive_timeout" &&
                        "The timeout was reached before a final non-probabilistic conclusion was available."}
                    </div>
                  </div>

                  <div className="rounded-xl border border-current/20 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                    {result.cached ? "Cached result" : "Fresh computation"}
                  </div>
                </div>

                <div className="mt-4 break-all rounded-xl border border-current/20 bg-black/10 px-4 py-3 font-mono text-xs">
                  {result.normalized}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Method
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {getMethodLabel(result.method)}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Bit length
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {result.bitLength}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Completed MR rounds
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {result.completedRounds}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Target MR rounds
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {result.targetRounds}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Elapsed time
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {formatMs(result.elapsedMs)}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Cached
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {result.cached ? "Yes" : "No"}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Small-prime rejection
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-100">
                    {result.rejectedBySmallPrime
                      ? `Divisible by ${result.rejectedBySmallPrime}`
                      : "None"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                <div className="font-semibold text-zinc-200">Interpretation</div>
                <div className="mt-2 leading-6">{getInterpretation(result)}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}