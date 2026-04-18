import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkouts, saveWorkout, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  endurance: "Endurance & Cardio",
  flexibility: "Flexibility & Mobility",
  general: "General Fitness",
};

const TARGET_LABELS: Record<string, string> = {
  full_body: "Full Body",
  upper_body: "Upper Body",
  lower_body: "Lower Body",
  core: "Core & Abs",
  cardio: "Cardio",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  none: "No Equipment (Bodyweight only)",
  home: "Home Gym (dumbbells, resistance bands)",
  gym: "Full Gym",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const workouts = await getWorkouts(session.user.id);
    return NextResponse.json({ workouts });
  } catch {
    await runMigrations();
    const workouts = await getWorkouts(session.user.id);
    return NextResponse.json({ workouts });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal, target, level, equipment, duration, save } = await req.json();
  if (!goal || !target || !level || !equipment || !duration) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const goalLabel = GOAL_LABELS[goal] ?? goal;
  const targetLabel = TARGET_LABELS[target] ?? target;
  const levelLabel = LEVEL_LABELS[level] ?? level;
  const equipmentLabel = EQUIPMENT_LABELS[equipment] ?? equipment;

  const prompt = `You are a certified personal trainer. Create a ${duration}-minute workout plan for:
- Goal: ${goalLabel}
- Target area: ${targetLabel}
- Fitness level: ${levelLabel}
- Equipment: ${equipmentLabel}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "intro": "2-3 sentence overview of the workout approach",
  "warmup": [
    { "name": "Exercise name", "duration": "e.g. 45 seconds", "instructions": ["step 1", "step 2", "step 3"] }
  ],
  "exercises": [
    {
      "name": "Exercise name",
      "muscle_group": "e.g. Chest, Triceps",
      "sets": "e.g. 3",
      "reps": "e.g. 10-12 reps or 40 seconds",
      "rest": "e.g. 60 seconds",
      "instructions": ["step 1", "step 2", "step 3", "step 4"],
      "common_mistakes": ["mistake 1", "mistake 2"],
      "youtube_query": "short search query for this exercise e.g. how to do push ups proper form"
    }
  ],
  "cooldown": [
    { "name": "Stretch name", "duration": "e.g. 30 seconds each side", "instructions": ["step 1", "step 2"] }
  ],
  "pro_tips": ["tip 1", "tip 2", "tip 3"]
}

Include 3-4 warm-up exercises, 5-7 main exercises, and 3-4 cool-down stretches. Make it practical and achievable within ${duration} minutes.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip any accidental markdown code fences
  const content = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const title = `${goalLabel} · ${targetLabel} · ${duration} min`;

  if (save) {
    const id = crypto.randomUUID();
    try {
      await saveWorkout(id, session.user.id, title, goal, target, level, equipment, duration, content);
    } catch {
      await runMigrations();
      await saveWorkout(id, session.user.id, title, goal, target, level, equipment, duration, content);
    }
    return NextResponse.json({ content, title, id });
  }

  return NextResponse.json({ content, title });
}
