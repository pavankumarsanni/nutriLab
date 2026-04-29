import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteWeightLog } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteWeightLog(params.id, session.user.id);
  return NextResponse.json({ ok: true });
}
