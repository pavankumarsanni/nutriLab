import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSavedRecipes, saveRecipe } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await getSavedRecipes(session.user.id);
  return NextResponse.json({ recipes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = crypto.randomUUID();
  await saveRecipe(id, session.user.id, title, content);
  return NextResponse.json({ id });
}
