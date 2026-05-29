import webpush from "web-push";
import { getAllSubscriptionsWithPrefs, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await runMigrations();

  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  const subs = await getAllSubscriptionsWithPrefs();
  const sends: Promise<void>[] = [];

  for (const sub of subs) {
    const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };

    // Workout reminder — match user's preferred time (UTC, approx within same hour)
    if (sub.workout_reminder && sub.workout_reminder_time.slice(0, 2) === String(hour).padStart(2, '0')) {
      sends.push(
        webpush.sendNotification(pushSub, JSON.stringify({
          title: "🏋️ Workout Reminder",
          body: "Time to crush your workout! Open NutriFitLab to get started.",
          tag: "workout-reminder",
          url: "/"
        })).then(() => {}).catch(() => {})
      );
    }

    // Water reminder — every 2 hours between 8am-8pm UTC
    if (sub.water_reminder && hour >= 8 && hour <= 20 && hour % 2 === 0 && minute < 5) {
      sends.push(
        webpush.sendNotification(pushSub, JSON.stringify({
          title: "💧 Hydration Check",
          body: "Have you had enough water? Stay hydrated for peak performance!",
          tag: "water-reminder",
          url: "/"
        })).then(() => {}).catch(() => {})
      );
    }

    // Food diary reminder at 7pm UTC if food_reminder enabled
    if (sub.food_reminder && hour === 19 && minute < 5) {
      sends.push(
        webpush.sendNotification(pushSub, JSON.stringify({
          title: "🥗 Food Diary Reminder",
          body: "Don't forget to log your meals today! Track your nutrition progress.",
          tag: "food-reminder",
          url: "/"
        })).then(() => {}).catch(() => {})
      );
    }
  }

  await Promise.all(sends);
  return NextResponse.json({ ok: true, sent: sends.length });
}
