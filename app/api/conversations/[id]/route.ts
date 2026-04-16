import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteConversation } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await deleteConversation(params.id, session.user.id);
  return Response.json({ ok: true });
}
