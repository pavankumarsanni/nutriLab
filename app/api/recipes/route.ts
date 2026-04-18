import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSavedRecipes, saveRecipe, runMigrations } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const recipes = await getSavedRecipes(session.user.id);
    return NextResponse.json({ recipes });
  } catch {
    await runMigrations();
    const recipes = await getSavedRecipes(session.user.id);
    return NextResponse.json({ recipes });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const id = crypto.randomUUID();
  try {
    await saveRecipe(id, session.user.id, title, content);
  } catch {
    // Table may not exist yet — run migrations and retry
    await runMigrations();
    await saveRecipe(id, session.user.id, title, content);
  }
  return NextResponse.json({ id });
}
