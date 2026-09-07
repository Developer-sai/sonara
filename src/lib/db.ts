import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

declare global {
  var __sonaraSqlClient__: NeonQueryFunction<false, false> | undefined;
}

/** Lazily builds the client so a missing DATABASE_URL only fails an actual
 *  request, never module import — Next.js imports every route module during
 *  the build's page-data-collection step (even for fully dynamic routes),
 *  so throwing at module scope would break `next build` before any real
 *  request — and DB env vars legitimately aren't available at build time. */
function client(): NeonQueryFunction<false, false> {
  if (global.__sonaraSqlClient__) return global.__sonaraSqlClient__;
  const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) environment variable is required — connect a Postgres " +
        "database (e.g. Neon, via the Vercel Storage tab) and set it in your project's env vars."
    );
  }
  global.__sonaraSqlClient__ = neon(DATABASE_URL);
  return global.__sonaraSqlClient__;
}

/** Tagged-template SQL client over HTTP — no persistent connection to manage,
 *  which is exactly what a serverless/edge runtime needs. Every query in the
 *  app goes through this one function. */
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return client()(strings, ...values);
}

declare global {
  var __sonaraDbReady__: Promise<void> | undefined;
}

async function migrate(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT,
      avatar TEXT,
      created_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS connected_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT,
      mode TEXT NOT NULL DEFAULT 'demo',
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      connected_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS clouds (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      subtitle TEXT,
      aspect_ratio TEXT NOT NULL DEFAULT '9:16',
      theme_json TEXT NOT NULL DEFAULT '{}',
      elements_json TEXT NOT NULL DEFAULT '[]',
      is_public INTEGER NOT NULL DEFAULT 0,
      share_slug TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cloud_items (
      id TEXT PRIMARY KEY,
      cloud_id TEXT NOT NULL REFERENCES clouds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      album TEXT,
      artwork_url TEXT,
      provider TEXT NOT NULL DEFAULT 'manual',
      external_url TEXT,
      preview_url TEXT,
      duration_ms INTEGER,
      item_order INTEGER NOT NULL DEFAULT 0,
      rank INTEGER,
      genre TEXT,
      added_at TEXT
    )
  `;

  // Defensive, idempotent guards in case this runs against a database created
  // by an earlier version of the schema.
  await sql`ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS genre TEXT`;
  await sql`ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS added_at TEXT`;
  await sql`UPDATE cloud_items SET added_at = now()::text WHERE added_at IS NULL`;

  await sql`CREATE INDEX IF NOT EXISTS idx_clouds_user ON clouds(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cloud_items_cloud ON cloud_items(cloud_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id)`;
}

/** Runs the (idempotent) schema migration once per warm serverless instance.
 *  Every route that touches the database should `await ensureDb()` first. */
export function ensureDb(): Promise<void> {
  if (!global.__sonaraDbReady__) {
    global.__sonaraDbReady__ = migrate();
  }
  return global.__sonaraDbReady__;
}

export function nowIso(): string {
  return new Date().toISOString();
}
