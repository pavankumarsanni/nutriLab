import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image_base64, media_type } = await req.json();
  if (!image_base64 || !media_type) return NextResponse.json({ error: "Missing image data" }, { status: 400 });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
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
              text: `This is a nutrition facts label. Extract the nutritional information per serving.
Return ONLY a JSON object with these exact keys (numbers only, no units):
{ "food_name": "product name if visible, else Nutrition Label", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number }
If a value is not present on the label, use null.`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as {
      food_name: string;
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
      fiber_g: number | null;
    };

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse label" }, { status: 422 });
  }
}
