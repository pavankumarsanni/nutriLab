import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { messages, workoutTitle, workoutContent } = await req.json();
  if (!messages || !workoutContent) return new Response("Missing fields", { status: 400 });

  const profile = await getUserProfile(session.user.id).catch(() => null);

  const profileContext = profile ? `
User profile:
- Age: ${profile.age ?? "not specified"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "not specified"}
- Current weight: ${profile.current_weight_kg ? `${profile.current_weight_kg} kg` : "not specified"}
- Target weight: ${profile.target_weight_kg ? `${profile.target_weight_kg} kg` : "not specified"}
- Activity level: ${profile.activity_level ?? "not specified"}${profile.injuries ? `\n- Injuries/limitations: ${profile.injuries}` : ""}
` : "";

  const systemPrompt = `You are a certified personal trainer helping a user with their workout plan.

The user has just generated the following workout plan titled "${workoutTitle}":
${workoutContent}
${profileContext}

Answer questions about this workout, suggest modifications, explain exercises, offer alternatives, and give coaching advice. Keep responses concise and practical. If the user asks to modify the plan (e.g. replace an exercise, make it harder/easier, remove equipment), suggest the specific change clearly.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
