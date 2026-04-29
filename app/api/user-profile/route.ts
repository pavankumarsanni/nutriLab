import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile, upsertUserProfile, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profile = await getUserProfile(session.user.id);
    return NextResponse.json({ profile });
  } catch {
    await runMigrations();
    const profile = await getUserProfile(session.user.id);
    return NextResponse.json({ profile });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { height_cm, current_weight_kg, target_weight_kg, age, activity_level, injuries, sex } = await req.json();

  try {
    await upsertUserProfile(
      session.user.id,
      height_cm ?? null,
      current_weight_kg ?? null,
      target_weight_kg ?? null,
      age ?? null,
      activity_level ?? null,
      injuries ?? null,
      sex ?? null
    );
    return NextResponse.json({ ok: true });
  } catch {
    await runMigrations();
    await upsertUserProfile(
      session.user.id,
      height_cm ?? null,
      current_weight_kg ?? null,
      target_weight_kg ?? null,
      age ?? null,
      activity_level ?? null,
      injuries ?? null,
      sex ?? null
    );
    return NextResponse.json({ ok: true });
  }
}
