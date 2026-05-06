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

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
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
            text: `Identify the food in this image and estimate the total calories. Reply in this exact format on two lines:
FOOD: <food name, brief description>
CALORIES: <integer number only>

If you cannot identify food in the image, reply:
FOOD: Unknown
CALORIES: 0`,
          },
        ],
      },
    ],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();
  const foodMatch = text.match(/FOOD:\s*(.+)/);
  const caloriesMatch = text.match(/CALORIES:\s*(\d+)/);

  const food_name = foodMatch?.[1]?.trim() ?? "Unknown food";
  const calories = parseInt(caloriesMatch?.[1] ?? "0", 10);

  if (calories === 0 && food_name === "Unknown food") {
    return NextResponse.json({ error: "Could not identify food" }, { status: 422 });
  }

  return NextResponse.json({ food_name, calories });
}
