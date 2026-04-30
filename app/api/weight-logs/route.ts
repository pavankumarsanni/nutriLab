import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWeightLogs, addWeightLog, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const logs = await getWeightLogs(session.user.id);
    return NextResponse.json({ logs });
  } catch {
    await runMigrations();
    const logs = await getWeightLogs(session.user.id);
    return NextResponse.json({ logs });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { weight_kg, logged_at } = await req.json();
  if (!weight_kg) return NextResponse.json({ error: "Missing weight_kg" }, { status: 400 });

  const id = crypto.randomUUID();
  // Use noon UTC to avoid timezone day-shift bugs
  const timestamp = logged_at
    ? new Date(logged_at + "T12:00:00").toISOString()
    : new Date().toISOString();

  try {
    await addWeightLog(id, session.user.id, weight_kg, timestamp);
  } catch {
    await runMigrations();
    await addWeightLog(id, session.user.id, weight_kg, timestamp);
  }

  return NextResponse.json({ log: { id, weight_kg, logged_at: timestamp } });
}
