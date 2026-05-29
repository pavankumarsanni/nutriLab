import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id;
    const pool = getPool();

    // 1. Food logs
    let foodRows: { food_name: string; calories: number | null; logged_date: string }[] = [];
    try {
      const r = await pool.query(
        `SELECT food_name, calories, logged_date FROM food_logs WHERE user_id=$1 AND logged_date >= NOW()-INTERVAL '7 days'`,
        [userId]
      );
      foodRows = r.rows;
    } catch {
      await runMigrations();
      const r = await pool.query(
        `SELECT food_name, calories, logged_date FROM food_logs WHERE user_id=$1 AND logged_date >= NOW()-INTERVAL '7 days'`,
        [userId]
      );
      foodRows = r.rows;
    }

    // 2. Workout logs
    let workoutRows: { workout_title: string; duration_secs: number | null; mood: string | null; logged_at: string }[] = [];
    try {
      const r = await pool.query(
        `SELECT workout_title, duration_secs, mood, logged_at FROM workout_logs WHERE user_id=$1 AND logged_at >= NOW()-INTERVAL '7 days'`,
        [userId]
      );
      workoutRows = r.rows;
    } catch {
      // table may not exist yet
    }

    // 3. Water logs
    let waterRows: { date: string; total: number }[] = [];
    try {
      const r = await pool.query(
        `SELECT logged_at::date as date, SUM(amount_ml) as total FROM water_logs WHERE user_id=$1 AND logged_at >= NOW()-INTERVAL '7 days' GROUP BY 1`,
        [userId]
      );
      waterRows = r.rows;
    } catch {
      // table may not exist yet
    }

    // 4. Weight logs
    let weightRows: { weight_kg: number; logged_at: string }[] = [];
    try {
      const r = await pool.query(
        `SELECT weight_kg, logged_at FROM weight_logs WHERE user_id=$1 AND logged_at >= NOW()-INTERVAL '7 days' ORDER BY logged_at ASC`,
        [userId]
      );
      weightRows = r.rows;
    } catch {
      // ignore
    }

    // Build summaries
    const workoutCount = workoutRows.length;
    const workoutSummary = workoutCount === 0
      ? "no workouts logged"
      : workoutRows.map((w) => `${w.workout_title}${w.duration_secs ? ` (${Math.round(w.duration_secs / 60)}min)` : ""}${w.mood ? ` [mood: ${w.mood}]` : ""}`).join(", ");

    const foodCalories = foodRows.map((f) => f.calories ?? 0).filter((c) => c > 0);
    const avgCals = foodCalories.length > 0 ? Math.round(foodCalories.reduce((a, b) => a + b, 0) / foodCalories.length) : 0;
    const uniqueFoodsSet = new Set(foodRows.map((f) => f.food_name));
    const uniqueFoods = Array.from(uniqueFoodsSet).slice(0, 10);
    const foodSummary = foodRows.length === 0
      ? "no food logged"
      : `${foodRows.length} meals logged including ${uniqueFoods.join(", ")}`;

    const totalWater = waterRows.reduce((s, r) => s + Number(r.total), 0);
    const waterSummary = waterRows.length === 0
      ? "no water intake logged"
      : `${(totalWater / 1000).toFixed(1)}L total over ${waterRows.length} days (avg ~${(totalWater / (waterRows.length * 1000)).toFixed(1)}L/day)`;

    const weightSummary = weightRows.length === 0
      ? "no weight logs this week"
      : `started at ${weightRows[0].weight_kg}kg, ended at ${weightRows[weightRows.length - 1].weight_kg}kg`;

    const prompt = `You are a personal health coach reviewing a user's week. Here is their data:

WORKOUTS (${workoutCount} sessions): ${workoutSummary}
FOOD DIARY: ${foodSummary} (avg ~${avgCals} cal/day)
WATER: ${waterSummary}
WEIGHT: ${weightSummary}

Write a warm, motivating weekly summary in exactly this JSON format:
{
  "headline": "One punchy headline about their week (max 8 words)",
  "score": <number 1-10 overall health score>,
  "highlights": ["2-3 specific positive things they did"],
  "improvements": ["1-2 specific actionable suggestions for next week"],
  "workout_insight": "1-2 sentences about their training",
  "nutrition_insight": "1-2 sentences about their eating",
  "water_insight": "1 sentence about hydration",
  "motivation": "One inspiring closing sentence personalized to their data"
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const summary = JSON.parse(cleaned) as {
      headline: string;
      score: number;
      highlights: string[];
      improvements: string[];
      workout_insight: string;
      nutrition_insight: string;
      water_insight: string;
      motivation: string;
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("weekly-summary error", err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
