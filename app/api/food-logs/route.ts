import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFoodLogs, addFoodLog, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  try {
    const logs = await getFoodLogs(session.user.id, date);
    return NextResponse.json({ logs });
  } catch {
    await runMigrations();
    const logs = await getFoodLogs(session.user.id, date);
    return NextResponse.json({ logs });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meal_type, food_name, calories, logged_date } = await req.json();
  if (!meal_type || !food_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = crypto.randomUUID();
  const date = logged_date ?? new Date().toISOString().slice(0, 10);

  try {
    await addFoodLog(id, session.user.id, meal_type, food_name, calories ?? null, date);
  } catch {
    await runMigrations();
    await addFoodLog(id, session.user.id, meal_type, food_name, calories ?? null, date);
  }

  return NextResponse.json({ log: { id, meal_type, food_name, calories: calories ?? null, logged_date: date } });
}
