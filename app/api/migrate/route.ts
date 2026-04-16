import { runMigrations } from "@/lib/db";

// Run once to create all tables, then this endpoint can be ignored.
// Protected by a secret to prevent accidental re-runs.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.MIGRATION_SECRET) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await runMigrations();
    return Response.json({ ok: true, message: "Migrations ran successfully" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
