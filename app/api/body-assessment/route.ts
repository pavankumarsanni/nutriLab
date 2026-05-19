import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ASSESSMENT_PROMPT = (goal: string, currentPhysique?: string) => `You are an expert fitness coach and body composition specialist. Analyse the physique${currentPhysique ? ` described as "${currentPhysique}"` : " shown in the photo"} and provide a personalised fitness assessment for someone whose goal is: "${goal}".

Return ONLY a valid JSON object (no markdown fences, no extra text) with this exact structure:
{
  "current_type": "e.g. Slim / Average / Athletic / Stocky",
  "current_summary": "2-3 sentences about current physique based on photo or self-description",
  "areas_to_focus": ["area 1", "area 2", "area 3"],
  "approach": "bulk | cut | recomp",
  "approach_explanation": "1-2 sentences explaining why this approach suits them",
  "timeline": "e.g. 4-6 months",
  "workout_recommendation": "e.g. 4 days/week hypertrophy training",
  "diet_recommendation": "1-2 sentences on diet approach",
  "suggested_workout_prompt": "A ready-to-use prompt for the workout generator, e.g. 'Generate a 4-day hypertrophy split for someone with slim frame wanting classic aesthetic physique'"
}`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { image_base64, media_type, current_physique, goal } = await req.json();

    if (!goal) return NextResponse.json({ error: "Missing goal" }, { status: 400 });

    let raw: string;

    if (image_base64 && media_type) {
      // Vision mode — analyse the photo
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type, data: image_base64 },
              },
              {
                type: "text",
                text: ASSESSMENT_PROMPT(goal),
              },
            ],
          },
        ],
      });
      raw = (message.content[0] as { type: string; text: string }).text.trim();
    } else {
      // Text-only mode — use the self-description
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: ASSESSMENT_PROMPT(goal, current_physique),
          },
        ],
      });
      raw = (message.content[0] as { type: string; text: string }).text.trim();
    }

    // Strip markdown code fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) raw = fenceMatch[1].trim();
    if (!raw.startsWith("{")) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0].trim();
    }

    try {
      const result = JSON.parse(raw);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    // Surface a clean message for common Anthropic API errors
    let message = "Something went wrong. Please try again.";
    if (raw.includes("credit") || raw.includes("billing") || raw.includes("balance")) {
      message = "API credits are low. Please top up your Anthropic account to continue.";
    } else if (raw.includes("rate") || raw.includes("429")) {
      message = "Too many requests. Please wait a moment and try again.";
    } else if (raw.includes("401") || raw.includes("authentication")) {
      message = "API authentication error. Please check your API key.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
