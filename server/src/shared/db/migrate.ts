import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { env } from "#src/config/index.ts";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");
const LOCK_KEY = 424242;

async function ensureMigrationsTable(sql: ReturnType<typeof postgres>) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

async function getAppliedIds(
  sql: ReturnType<typeof postgres>
): Promise<Set<string>> {
  const res = await sql<
    { id: string }[]
  >`SELECT id FROM schema_migrations ORDER BY id;`;
  return new Set(res.map((r) => r.id));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));
}

async function applyOne(sql: ReturnType<typeof postgres>, file: string) {
  const id = file;
  const fullPath = path.join(MIGRATIONS_DIR, file);
  const sqlText = await readFile(fullPath, "utf8");

  await sql.begin(async (tx) => {
    await tx.unsafe("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    try {
      // Execute the migration SQL file
      await tx.unsafe(sqlText);

      await tx.unsafe("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
    } finally {
      await tx.unsafe("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  });
}

async function main() {
  // Use the same connection method as the main app
  const connectionString = env.db.url;

  // Log connection info (without password) for debugging
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Connecting to database: ${maskedUrl}`);

  const sql = postgres(connectionString);

  try {
    await ensureMigrationsTable(sql);

    const applied = await getAppliedIds(sql);
    const files = await listMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("✅ No pending migrations.");
      return;
    }

    console.log(`➡️ Pending migrations: ${pending.length}`);
    for (const f of pending) {
      console.log(`   Applying: ${f}`);
      await applyOne(sql, f);
      console.log(`   ✅ Applied: ${f}`);
    }

    console.log("🎉 All migrations applied.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exitCode = 1;
});
