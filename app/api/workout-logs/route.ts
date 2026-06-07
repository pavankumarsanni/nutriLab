import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkoutLogs, saveWorkoutLog, getUserProfile, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const data = await getWorkoutLogs(session.user.id);
  return NextResponse.json(data);
}

/**
 * Estimate calories burned during a strength session.
 *
 * Formula combines two components:
 *   1. Lifting component  — total volume (kg) × 0.1
 *      Derived from the Epley approximation: each kg·rep ≈ 0.1 kcal
 *   2. Activity component — accounts for warmup / rest / cooldown time
 *      Uses a 3.5 MET equivalent for light activity between sets:
 *      kcal/min = body_weight_kg × 3.5 / 200
 */
function estimateCalories(
  sets: { weightKg: number | null; reps: number | null }[],
  durationSecs: number,
  bodyWeightKg: number
): number {
  const totalVolumeKg = sets.reduce(
    (sum, s) => sum + (s.weightKg != null && s.reps != null ? s.weightKg * s.reps : 0),
    0
  );
  const liftingCalories  = totalVolumeKg * 0.1;
  const activityCalories = (durationSecs / 60) * bodyWeightKg * (3.5 / 200);
  return Math.max(1, Math.round(liftingCalories + activityCalories));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { workoutId, workoutTitle, durationSecs, mood, notes, sets } = await req.json();

  // Fetch user profile for body weight (fallback 75 kg if not set)
  const profile = await getUserProfile(session.user.id);
  const bodyWeightKg = profile?.current_weight_kg ?? 75;

  const caloriesBurned = estimateCalories(sets ?? [], durationSecs ?? 0, bodyWeightKg);

  const id = crypto.randomUUID();
  await saveWorkoutLog(
    id, session.user.id, workoutId ?? null, workoutTitle,
    durationSecs, mood ?? null, notes ?? null, sets ?? [], caloriesBurned
  );

  return NextResponse.json({ id, caloriesBurned });
}
