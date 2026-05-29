import webpush from "web-push";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPushSubscriptions } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subs = await getPushSubscriptions(session.user.id);
  await Promise.all(subs.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: "🎉 NutriFitLab", body: "Push notifications are working!", tag: "test" })
    ).catch(() => {})
  ));
  return NextResponse.json({ ok: true });
}
