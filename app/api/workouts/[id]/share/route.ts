import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shareWorkout, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let shareId: string;
  try {
    shareId = await shareWorkout(params.id, session.user.id);
  } catch {
    // Column might not exist yet — run migrations and retry
    await runMigrations();
    shareId = await shareWorkout(params.id, session.user.id);
  }

  // Derive the base URL from the request itself so it always works
  // even if NEXTAUTH_URL is not set on Vercel
  const reqUrl = new URL(req.url);
  const base = process.env.NEXTAUTH_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  return NextResponse.json({ shareUrl: `${base}/share/workout/${shareId}` });
}
