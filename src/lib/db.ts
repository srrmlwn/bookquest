import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { SCHEMA } from "./schema";

type Row = Record<string, unknown>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

let queryFn: QueryFn | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_PRISMA_URL;
  if (!url) throw new DbNotConfigured();
  return url;
}

export class DbNotConfigured extends Error {
  constructor() {
    super("No database is connected. Add Neon Postgres to the Vercel project.");
  }
}

function getQuery(): QueryFn {
  if (queryFn) return queryFn;
  const url = connectionString();
  if (url.includes("neon.tech")) {
    const sql = neon(url);
    queryFn = (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  } else {
    // Local development against a plain Postgres.
    const pool = new Pool({ connectionString: url });
    queryFn = async (text, params = []) => (await pool.query(text, params)).rows;
  }
  return queryFn;
}

function schemaStatements(): string[] {
  return SCHEMA
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const q = getQuery();
      for (const stmt of schemaStatements()) await q(stmt);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await getQuery()(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
