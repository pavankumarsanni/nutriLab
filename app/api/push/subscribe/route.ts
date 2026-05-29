import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { savePushSubscription, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { endpoint, keys } = await req.json() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const id = crypto.randomUUID();
  await savePushSubscription(id, session.user.id, endpoint, keys.p256dh, keys.auth);
  return NextResponse.json({ ok: true });
}
