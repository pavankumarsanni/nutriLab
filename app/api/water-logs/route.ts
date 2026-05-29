import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWaterToday, getWaterThisWeek, addWaterLog, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [today_ml, week] = await Promise.all([
      getWaterToday(session.user.id),
      getWaterThisWeek(session.user.id),
    ]);
    return NextResponse.json({ today_ml, week });
  } catch {
    await runMigrations();
    const [today_ml, week] = await Promise.all([
      getWaterToday(session.user.id),
      getWaterThisWeek(session.user.id),
    ]);
    return NextResponse.json({ today_ml, week });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount_ml } = await req.json() as { amount_ml: number };
  if (!amount_ml || amount_ml <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const id = crypto.randomUUID();

  try {
    await addWaterLog(id, session.user.id, amount_ml);
  } catch {
    await runMigrations();
    await addWaterLog(id, session.user.id, amount_ml);
  }

  return NextResponse.json({ ok: true });
}
