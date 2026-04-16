import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getConversations } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await getConversations(session.user.id);
  return Response.json({ conversations });
}
