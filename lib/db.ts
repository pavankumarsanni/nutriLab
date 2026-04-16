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
