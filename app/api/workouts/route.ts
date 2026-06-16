import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkouts, saveWorkout, runMigrations, getUserProfile } from "@/lib/db";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

/** Extract the first valid JSON object from a Claude response string. */
function extractJson(raw: string): string | null {
  let text = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) text = fence[1].trim();
  // Already starts with { — take it
  if (text.startsWith("{")) return text;
  // Find the first { ... } block in any surrounding prose
  const block = text.match(/\{[\s\S]*\}/);
  if (block) return block[0].trim();
  return null;
}

/** Return true only if the JSON string has the workout plan shape we need. */
function isValidWorkoutJson(json: string): boolean {
  try {
    const p = JSON.parse(json) as Record<string, unknown>;
    const hasSingle = Array.isArray(p.exercises) && (p.exercises as unknown[]).length > 0;
    const hasMulti  = Array.isArray(p.days)      && (p.days as unknown[]).length > 0;
    return hasSingle || hasMulti;
  } catch { return false; }
}

const RETRY_SUFFIX = "\n\nIMPORTANT: Your previous response contained extra text or was not valid JSON. Return ONLY the raw JSON object — no markdown fences, no explanation, no preamble. Start your response with { and end with }.";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  endurance: "Endurance & Cardio",
  flexibility: "Flexibility & Mobility",
  general: "General Fitness",
};

const TARGET_LABELS: Record<string, string> = {
  full_body:  "Full Body",
  upper_body: "Upper Body",
  lower_body: "Lower Body",
  core:       "Core & Abs",
  cardio:     "Cardio",
  chest:      "Chest",
  back:       "Back & Lats",
  shoulders:  "Shoulders",
  arms:       "Biceps & Triceps",
  glutes:     "Glutes & Hamstrings",
  quads:      "Quads",
  calves:     "Calves",
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

  const { goal, target, level, equipment, duration, save, customRequest, existingContent, existingTitle } = await req.json();

  // Fast-save path: content already generated, just persist it
  if (save && existingContent && existingTitle) {
    const id = crypto.randomUUID();
    const g = customRequest ? "custom" : (goal ?? "custom");
    const t = customRequest ? "custom" : (target ?? "custom");
    const l = customRequest ? "custom" : (level ?? "custom");
    const eq = customRequest ? "custom" : (equipment ?? "custom");
    const dur = customRequest ? 0 : (duration ?? 0);
    await saveWorkout(id, session.user.id, existingTitle, g, t, l, eq, dur, existingContent);
    return NextResponse.json({ id, title: existingTitle, content: existingContent });
  }

  // Custom request mode — skip preset validation
  if (!customRequest && (!goal || !target || !level || !equipment || !duration)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const goalLabel = GOAL_LABELS[goal] ?? goal;
  const targetLabel = TARGET_LABELS[target] ?? target;
  const levelLabel = LEVEL_LABELS[level] ?? level;
  const equipmentLabel = EQUIPMENT_LABELS[equipment] ?? equipment;

  const profile = await getUserProfile(session.user.id).catch(() => null);

  const profileContext = profile ? `
User profile:
- Age: ${profile.age ?? "not specified"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "not specified"}
- Current weight: ${profile.current_weight_kg ? `${profile.current_weight_kg} kg` : "not specified"}
- Target weight: ${profile.target_weight_kg ? `${profile.target_weight_kg} kg` : "not specified"}
- Activity level: ${profile.activity_level ?? "not specified"}${profile.injuries ? `\n- Injuries/limitations: ${profile.injuries} — avoid exercises that aggravate these areas` : ""}
` : "";

  // Custom request prompt
  if (customRequest) {
    const customPrompt = `You are a certified personal trainer. Create a workout plan based on this request: "${customRequest}"
${profileContext}
IMPORTANT — choose the correct JSON schema based on the request:

• If the request mentions multiple days, sessions, a split, a weekly plan, or any phrasing that implies more than one workout session → use the MULTI-DAY schema.
• Otherwise → use the SINGLE-DAY schema.

Keep instructions to 3 steps each and common_mistakes to 2 items. Return ONLY a valid JSON object (no markdown, no extra text).

SINGLE-DAY schema (one session, 45-60 min):
{
  "intro": "2-3 sentence overview",
  "warmup": [{ "name": "...", "duration": "...", "instructions": ["step 1","step 2","step 3"] }],
  "exercises": [{ "name": "...", "muscle_group": "...", "sets": "3", "reps": "10-12", "rest": "60 seconds", "instructions": ["step 1","step 2","step 3"], "common_mistakes": ["mistake 1","mistake 2"], "youtube_query": "search query" }],
  "cooldown": [{ "name": "...", "duration": "...", "instructions": ["step 1","step 2"] }],
  "pro_tips": ["tip 1","tip 2","tip 3"]
}

MULTI-DAY schema (multiple sessions — include ALL days, each 45-60 min, max 5 exercises per day):
{
  "type": "multi_day",
  "intro": "2-3 sentence overview of the full programme",
  "days": [
    {
      "day": 1,
      "label": "e.g. Chest & Triceps",
      "warmup": [{ "name": "...", "duration": "...", "instructions": ["step 1","step 2","step 3"] }],
      "exercises": [{ "name": "...", "muscle_group": "...", "sets": "3", "reps": "10-12", "rest": "60 seconds", "instructions": ["step 1","step 2","step 3"], "common_mistakes": ["mistake 1","mistake 2"], "youtube_query": "search query" }],
      "cooldown": [{ "name": "...", "duration": "...", "instructions": ["step 1","step 2"] }]
    }
  ],
  "pro_tips": ["tip 1","tip 2","tip 3"]
}`;

    const customMessage = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: customPrompt }],
    });

    const customRaw = customMessage.content[0].type === "text" ? customMessage.content[0].text : "";
    let customContent = extractJson(customRaw) ?? customRaw.trim();

    // Retry once if the response isn't a valid workout plan
    if (!isValidWorkoutJson(customContent)) {
      const retryMsg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          { role: "user", content: customPrompt },
          { role: "assistant", content: customRaw },
          { role: "user", content: RETRY_SUFFIX },
        ],
      });
      const retryRaw = retryMsg.content[0].type === "text" ? retryMsg.content[0].text : "";
      const retryJson = extractJson(retryRaw);
      if (retryJson && isValidWorkoutJson(retryJson)) customContent = retryJson;
    }
    const customTitle = customRequest.slice(0, 60) + (customRequest.length > 60 ? "…" : "");
    if (save) {
      const id = crypto.randomUUID();
      try {
        await saveWorkout(id, session.user.id, customTitle, "custom", "custom", "custom", "custom", 0, customContent);
      } catch {
        await runMigrations();
        await saveWorkout(id, session.user.id, customTitle, "custom", "custom", "custom", "custom", 0, customContent);
      }
      return NextResponse.json({ content: customContent, title: customTitle, id });
    }
    return NextResponse.json({ content: customContent, title: customTitle });
  }

  const prompt = `You are a certified personal trainer. Create a ${duration}-minute workout plan for:
- Goal: ${goalLabel}
- Target area: ${targetLabel}
- Fitness level: ${levelLabel}
- Equipment: ${equipmentLabel}
${profileContext}

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
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  let content = extractJson(raw) ?? raw.trim();

  // If the extracted content isn't a valid workout plan, retry once with a stricter prompt
  if (!isValidWorkoutJson(content)) {
    const retryMessage = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: raw },
        { role: "user", content: RETRY_SUFFIX },
      ],
    });
    const retryRaw = retryMessage.content[0].type === "text" ? retryMessage.content[0].text : "";
    const retryJson = extractJson(retryRaw);
    if (retryJson && isValidWorkoutJson(retryJson)) content = retryJson;
  }

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
