import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

// ── Migrations ────────────────────────────────────────────────────────────────

export async function runMigrations() {
  const client = await getPool().connect();
  try {
    // NextAuth required tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image TEXT
      );
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `);

    // App tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_recipes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_saved_recipes_user ON saved_recipes(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS meal_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        diet TEXT NOT NULL,
        duration INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        height_cm INTEGER,
        current_weight_kg NUMERIC(5,1),
        target_weight_kg NUMERIC(5,1),
        age INTEGER,
        activity_level TEXT,
        injuries TEXT,
        sex TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sex TEXT;

      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight_kg NUMERIC(5,1) NOT NULL,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id, logged_at ASC);

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        target TEXT NOT NULL,
        level TEXT NOT NULL,
        equipment TEXT NOT NULL,
        duration INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id, created_at DESC);
    `);
  } finally {
    client.release();
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(email: string, name: string | null, image: string | null) {
  const id = crypto.randomUUID();
  const result = await getPool().query(
    `INSERT INTO users (id, email, name, image)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image
     RETURNING id`,
    [id, email, name, image]
  );
  return result.rows[0];
}

// ── Meal Plans ────────────────────────────────────────────────────────────────

export async function getMealPlans(userId: string) {
  const result = await getPool().query(
    `SELECT id, title, goal, diet, duration, content, created_at FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function saveMealPlan(
  id: string, userId: string, title: string,
  goal: string, diet: string, duration: number, content: string
) {
  await getPool().query(
    `INSERT INTO meal_plans (id, user_id, title, goal, diet, duration, content) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, title, goal, diet, duration, content]
  );
}

export async function deleteMealPlan(id: string, userId: string) {
  await getPool().query(
    `DELETE FROM meal_plans WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function getConversations(userId: string) {
  const result = await getPool().query(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function createConversation(id: string, userId: string, title: string) {
  await getPool().query(
    `INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)`,
    [id, userId, title]
  );
}

export async function deleteConversation(id: string, userId: string) {
  await getPool().query(
    `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// ── Saved Recipes ─────────────────────────────────────────────────────────────

export async function getSavedRecipes(userId: string) {
  const result = await getPool().query(
    `SELECT id, title, content, created_at FROM saved_recipes WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function saveRecipe(id: string, userId: string, title: string, content: string) {
  await getPool().query(
    `INSERT INTO saved_recipes (id, user_id, title, content) VALUES ($1, $2, $3, $4)`,
    [id, userId, title, content]
  );
}

export async function deleteRecipe(id: string, userId: string) {
  await getPool().query(
    `DELETE FROM saved_recipes WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function deleteUserAccount(userId: string) {
  // All child tables (user_profiles, conversations, messages, saved_recipes,
  // meal_plans, workouts, accounts, sessions) cascade from users(id)
  await getPool().query(`DELETE FROM users WHERE id = $1`, [userId]);
}

// ── User Profile ─────────────────────────────────────────────────────────────

export type UserProfile = {
  user_id: string;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  injuries: string | null;
  sex: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await getPool().query(
    `SELECT user_id, height_cm, current_weight_kg, target_weight_kg, age, activity_level, injuries, sex FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function upsertUserProfile(
  userId: string,
  height_cm: number | null,
  current_weight_kg: number | null,
  target_weight_kg: number | null,
  age: number | null,
  activity_level: string | null,
  injuries: string | null,
  sex: string | null = null
) {
  await getPool().query(
    `INSERT INTO user_profiles (user_id, height_cm, current_weight_kg, target_weight_kg, age, activity_level, injuries, sex)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       height_cm = EXCLUDED.height_cm,
       current_weight_kg = EXCLUDED.current_weight_kg,
       target_weight_kg = EXCLUDED.target_weight_kg,
       age = EXCLUDED.age,
       activity_level = EXCLUDED.activity_level,
       injuries = EXCLUDED.injuries,
       sex = EXCLUDED.sex,
       updated_at = NOW()`,
    [userId, height_cm, current_weight_kg, target_weight_kg, age, activity_level, injuries, sex]
  );
}

// ── Weight Logs ───────────────────────────────────────────────────────────────

export type WeightLog = { id: string; weight_kg: number; logged_at: string };

export async function getWeightLogs(userId: string): Promise<WeightLog[]> {
  const result = await getPool().query(
    `SELECT id, weight_kg, logged_at FROM weight_logs WHERE user_id = $1 ORDER BY logged_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function addWeightLog(id: string, userId: string, weight_kg: number, logged_at: string) {
  await getPool().query(
    `INSERT INTO weight_logs (id, user_id, weight_kg, logged_at) VALUES ($1, $2, $3, $4)`,
    [id, userId, weight_kg, logged_at]
  );
}

export async function deleteWeightLog(id: string, userId: string) {
  await getPool().query(
    `DELETE FROM weight_logs WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// ── Workouts ──────────────────────────────────────────────────────────────────

export async function getWorkouts(userId: string) {
  const result = await getPool().query(
    `SELECT id, title, goal, target, level, equipment, duration, content, created_at FROM workouts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function saveWorkout(
  id: string, userId: string, title: string,
  goal: string, target: string, level: string, equipment: string, duration: number, content: string
) {
  await getPool().query(
    `INSERT INTO workouts (id, user_id, title, goal, target, level, equipment, duration, content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, userId, title, goal, target, level, equipment, duration, content]
  );
}

export async function deleteWorkout(id: string, userId: string) {
  await getPool().query(
    `DELETE FROM workouts WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string, userId: string) {
  const result = await getPool().query(
    `SELECT m.role, m.content
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.conversation_id = $1 AND c.user_id = $2
     ORDER BY m.created_at ASC`,
    [conversationId, userId]
  );
  return result.rows;
}

export async function saveMessage(id: string, conversationId: string, role: string, content: string) {
  await getPool().query(
    `INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)`,
    [id, conversationId, role, content]
  );
  await getPool().query(
    `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
    [conversationId]
  );
}
