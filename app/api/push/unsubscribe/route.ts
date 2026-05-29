import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deletePushSubscription, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { endpoint } = await req.json() as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await deletePushSubscription(session.user.id, endpoint);
  return NextResponse.json({ ok: true });
}
