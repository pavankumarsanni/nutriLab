import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shareWorkout } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shareId = await shareWorkout(params.id, session.user.id);
  const base = process.env.NEXTAUTH_URL ?? "";
  return NextResponse.json({ shareUrl: `${base}/share/workout/${shareId}` });
}
