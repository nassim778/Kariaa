# Apply migrations in order. Requires:
#   SUPABASE_DB_PASSWORD
#   SUPABASE_PROJECT_REF (e.g. ahxxqllargtiyfajytwg)
#
# Usage:
#   node scripts/apply-migrations.mjs
#   SUPABASE_PROJECT_REF=otherref node scripts/apply-migrations.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!PASSWORD) {
  console.error("Set SUPABASE_DB_PASSWORD env var");
  process.exit(1);
}
if (!REF) {
  console.error("Set SUPABASE_PROJECT_REF env var");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const candidates = [
  { label: "direct", host: `db.${REF}.supabase.co`, port: 5432, user: "postgres" },
  {
    label: "pooler eu-central-1",
    host: "aws-0-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${REF}`,
  },
  {
    label: "pooler eu-west-1",
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${REF}`,
  },
];

async function tryConnect(c) {
  const client = new Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
    statement_timeout: 120000,
  });
  await client.connect();
  return client;
}

let client = null;
for (const c of candidates) {
  try {
    process.stdout.write(`Trying ${c.label} (${c.host})... `);
    client = await tryConnect(c);
    console.log("connected");
    break;
  } catch (e) {
    console.log(`failed: ${e.code || e.message}`);
    client = null;
  }
}

if (!client) {
  console.error("\nCould not connect to the database.");
  process.exit(2);
}

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await client.query(
      "select 1 from public.schema_migrations where filename = $1",
      [file]
    );
    if (rows.length) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`apply ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (filename) values ($1)",
        [file]
      );
      await client.query("commit");
      console.log(`  ok`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
  console.log("\nMigrations complete.");
} catch (e) {
  console.error("\nMigration error:", e.message);
  process.exitCode = 3;
} finally {
  await client.end();
}
