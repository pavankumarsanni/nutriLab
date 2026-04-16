import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMessages } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await getMessages(params.id, session.user.id);
  return Response.json({ messages });
}
