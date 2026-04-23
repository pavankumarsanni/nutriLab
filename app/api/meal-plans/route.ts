import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMealPlans, saveMealPlan, runMigrations, getUserProfile } from "@/lib/db";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GOAL_LABELS: Record<string, string> = {
  balanced: "Balanced & Nutritious",
  weight_loss: "Weight Loss",
  high_protein: "High Protein / Muscle Building",
  anti_inflammatory: "Anti-Inflammatory",
  energy: "Energy & Focus",
};

const DIET_LABELS: Record<string, string> = {
  none: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "Gluten-Free",
  dairy_free: "Dairy-Free",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const plans = await getMealPlans(session.user.id);
    return NextResponse.json({ plans });
  } catch {
    await runMigrations();
    const plans = await getMealPlans(session.user.id);
    return NextResponse.json({ plans });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal, diet, duration, save, customRequest } = await req.json();
  if (!customRequest && (!goal || !diet || !duration)) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const profile = await getUserProfile(session.user.id).catch(() => null);

  const profileContext = profile ? `
User profile:
- Age: ${profile.age ?? "not specified"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "not specified"}
- Current weight: ${profile.current_weight_kg ? `${profile.current_weight_kg} kg` : "not specified"}
- Target weight: ${profile.target_weight_kg ? `${profile.target_weight_kg} kg` : "not specified"}
- Activity level: ${profile.activity_level ?? "not specified"}${profile.injuries ? `\n- Injuries/limitations: ${profile.injuries}` : ""}
` : "";

  // Custom request mode
  if (customRequest) {
    const customPrompt = `You are a professional nutritionist. Create a meal plan based on this request: "${customRequest}"
${profileContext}
Format the plan clearly with:
- A brief intro (2-3 sentences about the approach)
- For each day: Day 1, Day 2, etc. with:
  - 🌅 Breakfast
  - ☀️ Lunch
  - 🌙 Dinner
  - 🍎 Snacks (1-2 options)
  - 💧 Hydration tip (1 line)
- End with a short "Key Nutrition Tips" section (3-4 bullet points)
Keep meals practical and science-backed. Use markdown formatting.`;

    const customMessage = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      messages: [{ role: "user", content: customPrompt }],
    });

    const customContent = customMessage.content[0].type === "text" ? customMessage.content[0].text : "";
    const customTitle = customRequest.slice(0, 60) + (customRequest.length > 60 ? "…" : "");

    if (save) {
      const id = crypto.randomUUID();
      try {
        await saveMealPlan(id, session.user.id, customTitle, "custom", "custom", 0, customContent);
      } catch {
        await runMigrations();
        await saveMealPlan(id, session.user.id, customTitle, "custom", "custom", 0, customContent);
      }
      return NextResponse.json({ content: customContent, title: customTitle, id });
    }
    return NextResponse.json({ content: customContent, title: customTitle });
  }

  const goalLabel = GOAL_LABELS[goal] ?? goal;
  const dietLabel = DIET_LABELS[diet] ?? diet;

  const prompt = `You are a professional nutritionist. Create a detailed ${duration}-day meal plan for someone with the following goals:

- **Goal:** ${goalLabel}
- **Diet type:** ${dietLabel}
- **Duration:** ${duration} days
${profileContext}
${profile?.current_weight_kg && profile?.height_cm ? `Tailor caloric intake and macros to the user's stats. Calculate appropriate daily calories based on their weight, height, age, and activity level.` : ""}
${profile?.target_weight_kg && profile?.current_weight_kg ? `The user wants to go from ${profile.current_weight_kg}kg to ${profile.target_weight_kg}kg — reflect this in portion sizes and caloric targets.` : ""}

Format the plan clearly with:
- A brief intro (2-3 sentences about the approach${profile ? ", referencing their specific stats" : ""})
- For each day: Day 1, Day 2, etc. with:
  - 🌅 Breakfast
  - ☀️ Lunch
  - 🌙 Dinner
  - 🍎 Snacks (1-2 options)
  - 💧 Hydration tip (1 line)
- End with a short "Key Nutrition Tips" section (3-4 bullet points)

Keep meals practical, delicious and science-backed. Include brief notes on WHY each meal supports the goal. Use markdown formatting with headers and bold text.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "";
  const title = `${goalLabel} · ${duration}-Day Plan`;

  if (save) {
    const id = crypto.randomUUID();
    try {
      await saveMealPlan(id, session.user.id, title, goal, diet, duration, content);
    } catch {
      await runMigrations();
      await saveMealPlan(id, session.user.id, title, goal, diet, duration, content);
    }
    return NextResponse.json({ content, title, id });
  }

  return NextResponse.json({ content, title });
}
