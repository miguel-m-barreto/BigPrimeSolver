import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkPrime } from "@/lib/primality";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  number: z.string().min(1),
  timeoutMs: z.number().int().min(100).max(30 * 60 * 1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { number, timeoutMs = 5000 } = parsed.data;
    const result = checkPrime(number, timeoutMs);
    const supabase = getSupabaseServerClient();

    if (result.classification === "prime" || result.classification === "composite") {
      const { error: deleteProbablyError } = await supabase
        .from("probably_prime_results")
        .delete()
        .eq("input_normalized", result.normalized);

      if (deleteProbablyError) {
        console.error("Supabase probably_prime delete error:", deleteProbablyError);
      }

      const { data: cachedExact, error: exactSelectError } = await supabase
        .from("prime_results")
        .select("*")
        .eq("input_normalized", result.normalized)
        .maybeSingle();

      if (!exactSelectError && cachedExact) {
        return NextResponse.json({
          ...result,
          cached: true,
        });
      }

      const { error: insertExactError } = await supabase.from("prime_results").upsert({
        input_normalized: result.normalized,
        is_prime: result.isPrime,
        classification: result.classification,
        method: result.method,
        elapsed_ms: result.elapsedMs,
        mr_rounds_completed: result.completedRounds,
        rejected_by_small_prime: result.rejectedBySmallPrime ?? null,
      });

      if (insertExactError) {
        console.error("Supabase prime_results upsert error:", insertExactError);
      }

      return NextResponse.json({
        ...result,
        cached: false,
      });
    }

    const { data: existingProbable, error: probableSelectError } = await supabase
      .from("probably_prime_results")
      .select("*")
      .eq("input_normalized", result.normalized)
      .maybeSingle();

    if (probableSelectError) {
      console.error("Supabase probably_prime select error:", probableSelectError);
    }

    const shouldUpsert =
      !existingProbable ||
      result.completedRounds > (existingProbable.mr_rounds_completed ?? 0);

    if (shouldUpsert) {
      const { error: probableUpsertError } = await supabase
        .from("probably_prime_results")
        .upsert({
          input_normalized: result.normalized,
          classification: result.classification,
          method: result.method,
          mr_rounds_completed: result.completedRounds,
          elapsed_ms: result.elapsedMs,
          bit_length: result.bitLength,
          target_rounds: result.targetRounds,
        });

      if (probableUpsertError) {
        console.error("Supabase probably_prime upsert error:", probableUpsertError);
      }
    }

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}