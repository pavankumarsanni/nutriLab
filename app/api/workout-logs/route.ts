import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkoutLogs, saveWorkoutLog, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const data = await getWorkoutLogs(session.user.id);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { workoutId, workoutTitle, durationSecs, mood, notes, sets } = await req.json();
  const id = crypto.randomUUID();
  await saveWorkoutLog(id, session.user.id, workoutId ?? null, workoutTitle, durationSecs, mood ?? null, notes ?? null, sets ?? []);
  return NextResponse.json({ id });
}
