import postgres from "postgres";
import { env } from "#src/config/index.ts";

async function dropAllObjects(sql: ReturnType<typeof postgres>) {
  // Drop all tables (CASCADE will also drop dependent objects like triggers, indexes, etc.)
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;

  if (tables.length > 0) {
    console.log(`🗑️  Dropping ${tables.length} table(s)...`);
    for (const table of tables) {
      // Escape identifier with double quotes
      const escapedName = `"${table.tablename.replace(/"/g, '""')}"`;
      await sql.unsafe(`DROP TABLE IF EXISTS ${escapedName} CASCADE;`);
    }
    console.log("✅ All tables dropped.");
  } else {
    console.log("ℹ️  No tables to drop.");
  }

  // Drop all custom types (ENUMs) - these might remain after table drops
  const types = await sql<{ typname: string }[]>`
    SELECT typname 
    FROM pg_type 
    WHERE typtype = 'e' 
    AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `;

  if (types.length > 0) {
    console.log(`🗑️  Dropping ${types.length} custom type(s)...`);
    for (const type of types) {
      // Escape identifier with double quotes
      const escapedName = `"${type.typname.replace(/"/g, '""')}"`;
      await sql.unsafe(`DROP TYPE IF EXISTS ${escapedName} CASCADE;`);
    }
    console.log("✅ All custom types dropped.");
  }

  // Drop all functions in public schema
  const functions = await sql<{ proname: string; oid: number }[]>`
    SELECT proname, oid
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname NOT LIKE 'pg_%'
  `;

  if (functions.length > 0) {
    console.log(`🗑️  Dropping ${functions.length} function(s)...`);
    for (const func of functions) {
      const signature = await sql<{ signature: string }[]>`
        SELECT pg_get_function_identity_arguments(${func.oid}) as signature
      `;
      // Escape identifier with double quotes
      const escapedName = `"${func.proname.replace(/"/g, '""')}"`;
      if (signature.length > 0 && signature[0]?.signature) {
        await sql.unsafe(
          `DROP FUNCTION IF EXISTS ${escapedName}(${signature[0].signature}) CASCADE;`
        );
      } else {
        await sql.unsafe(`DROP FUNCTION IF EXISTS ${escapedName}() CASCADE;`);
      }
    }
    console.log("✅ All functions dropped.");
  }
}

async function main() {
  const connectionString = env.db.url;

  // Log connection info (without password) for debugging
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Connecting to database: ${maskedUrl}`);

  const sql = postgres(connectionString);

  try {
    console.log("⚠️  Resetting database...");

    // Drop all database objects (tables, types, functions)
    await dropAllObjects(sql);

    console.log("🎉 Database reset complete.");
  } catch (err) {
    console.error("❌ Database reset failed:", err);
    throw err;
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exitCode = 1;
});
