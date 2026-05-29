import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotificationPrefs, upsertNotificationPrefs, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const prefs = await getNotificationPrefs(session.user.id);
  return NextResponse.json(prefs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const body = await req.json() as {
    water_reminder?: boolean;
    workout_reminder?: boolean;
    food_reminder?: boolean;
    workout_reminder_time?: string;
    water_interval_hours?: number;
  };
  await upsertNotificationPrefs(session.user.id, {
    water_reminder: body.water_reminder ?? true,
    workout_reminder: body.workout_reminder ?? true,
    food_reminder: body.food_reminder ?? true,
    workout_reminder_time: body.workout_reminder_time ?? '08:00',
    water_interval_hours: body.water_interval_hours ?? 2,
  });
  return NextResponse.json({ ok: true });
}
