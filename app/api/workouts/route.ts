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

  const prompt = `You are a certified personal trainer. Create a detailed ${duration}-minute workout plan with the following preferences:

- **Goal:** ${goalLabel}
- **Target area:** ${targetLabel}
- **Fitness level:** ${levelLabel}
- **Equipment:** ${equipmentLabel}
- **Duration:** ${duration} minutes

Format the workout clearly with:
- A brief intro (2-3 sentences about the approach and what to expect)
- **Warm-Up** (5 minutes): 3-4 dynamic warm-up exercises with duration
- **Main Workout**: exercises listed with sets, reps (or time), and rest periods. Group into sections if needed (e.g. Strength, Cardio Bursts)
- **Cool-Down** (5 minutes): 3-4 stretches with hold duration
- **Pro Tips**: 2-3 bullet points with form cues or training advice specific to this workout

For each exercise include: name, sets × reps or duration, rest time, and a one-line tip on proper form or why it's included.
Use markdown formatting with headers, bold text, and emoji where appropriate.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "";
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
