import { readFileSync } from "node:fs";
import { Client } from "pg";

const PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!PASSWORD) {
  console.error("Set SUPABASE_DB_PASSWORD env var");
  process.exit(1);
}
if (!REF) {
  console.error("Set SUPABASE_PROJECT_REF env var (e.g. yourprojectref)");
  process.exit(1);
}

const file = process.env.FILE || "../supabase/schema.sql";
const sqlPath = file.startsWith("..") ? new URL(file, import.meta.url) : file;
const sql = readFileSync(sqlPath, "utf8");
console.log(`Applying SQL from: ${file} (project ${REF})`);

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
  {
    label: "pooler eu-west-2",
    host: "aws-0-eu-west-2.pooler.supabase.com",
    port: 5432,
    user: `postgres.${REF}`,
  },
  {
    label: "pooler eu-west-3",
    host: "aws-0-eu-west-3.pooler.supabase.com",
    port: 5432,
    user: `postgres.${REF}`,
  },
  {
    label: "pooler us-east-1",
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${REF}`,
  },
  {
    label: "pooler us-east-2",
    host: "aws-0-us-east-2.pooler.supabase.com",
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
    statement_timeout: 60000,
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
  console.error("\nCould not connect to the database with any candidate host.");
  process.exit(2);
}

try {
  if (process.env.RESET === "1") {
    await client.query("truncate table public.listings");
    console.log("Existing listings cleared (RESET=1).");
  }
  await client.query(sql);
  console.log("\nSchema applied successfully.");
  const { rows } = await client.query(
    "select count(*)::int as n from public.listings"
  );
  console.log(`listings rows: ${rows[0].n}`);
} catch (e) {
  console.error("\nSchema execution error:", e.message);
  process.exitCode = 3;
} finally {
  await client.end();
}
