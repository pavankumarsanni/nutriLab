import webpush from "web-push";
import { getAllSubscriptionsWithPrefs, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await runMigrations();

  const subs = await getAllSubscriptionsWithPrefs();
  const sends: Promise<void>[] = [];

  for (const sub of subs) {
    const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };

    // Build a single morning digest message based on enabled reminders
    const lines: string[] = [];
    if (sub.workout_reminder) lines.push("🏋️ Time to plan your workout");
    if (sub.water_reminder)   lines.push("💧 Aim for 2.5L of water today");
    if (sub.food_reminder)    lines.push("🥗 Remember to log your meals");

    if (lines.length === 0) continue;

    sends.push(
      webpush.sendNotification(pushSub, JSON.stringify({
        title: "☀️ Good morning — NutriFitLab",
        body: lines.join(" · "),
        tag: "daily-digest",
        url: "/",
      })).then(() => {}).catch(() => {})
    );
  }

  await Promise.all(sends);
  return NextResponse.json({ ok: true, sent: sends.length });
}
