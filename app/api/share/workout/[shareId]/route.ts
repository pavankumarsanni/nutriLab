import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkoutByShareId, copySharedWorkout } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { shareId: string } }) {
  const workout = await getWorkoutByShareId(params.shareId);
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workout);
}

export async function POST(_req: Request, { params }: { params: { shareId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newId = await copySharedWorkout(params.shareId, session.user.id);
  return NextResponse.json({ id: newId });
}
