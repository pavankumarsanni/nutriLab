import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { food_name } = await req.json();
  if (!food_name?.trim()) return NextResponse.json({ error: "Missing food_name" }, { status: 400 });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    messages: [
      {
        role: "user",
        content: `Estimate the calories for: "${food_name}". Reply with ONLY a single integer number representing the estimated kilocalories. No units, no explanation, no range — just the number.`,
      },
    ],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();
  const calories = parseInt(text.replace(/[^0-9]/g, ""), 10);

  if (isNaN(calories)) return NextResponse.json({ error: "Could not estimate" }, { status: 422 });

  return NextResponse.json({ calories });
}
