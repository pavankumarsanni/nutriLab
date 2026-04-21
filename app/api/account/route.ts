import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteUserAccount(session.user.id);
  return NextResponse.json({ ok: true });
}
