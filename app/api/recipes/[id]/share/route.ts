import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shareRecipe, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let shareId: string;
  try {
    shareId = await shareRecipe(params.id, session.user.id);
  } catch {
    // Column might not exist yet — run migrations and retry
    await runMigrations();
    shareId = await shareRecipe(params.id, session.user.id);
  }

  const reqUrl = new URL(req.url);
  const base = process.env.NEXTAUTH_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  return NextResponse.json({ shareUrl: `${base}/share/recipe/${shareId}` });
}
