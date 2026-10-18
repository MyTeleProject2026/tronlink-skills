import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { checkSponsorLedgerReady } from "./sponsor_ledger.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(here, "../db/migrations/001_sponsor_payout_ledger.sql");

export async function connectSponsorDatabase(env = process.env) {
  const state = {
    configured: Boolean(env.DATABASE_URL),
    connected: false,
    schemaReady: false,
    migrationApplied: false,
    error: null
  };
  if (!env.DATABASE_URL) return { pool: null, state, close: async () => {} };

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 10000,
    application_name: "tronlink-skills-sponsor-ledger"
  });
  try {
    await pool.query("SELECT 1");
    state.connected = true;

    // Schema mutation is opt-in. Merely adding DATABASE_URL must not silently
    // apply DDL; enable SPONSOR_LEDGER_AUTO_MIGRATE=true after reviewing the
    // checked-in migration and confirming this is the intended database.
    if (env.SPONSOR_LEDGER_AUTO_MIGRATE === "true") {
      const migration = await readFile(migrationPath, "utf8");
      await pool.query(migration);
      state.migrationApplied = true;
    }
    state.schemaReady = await checkSponsorLedgerReady(pool);
  } catch (error) {
    state.error = error?.code === "ECONNREFUSED" ? "connection-refused" :
      error?.code === "28P01" ? "authentication-failed" :
      error?.code === "3D000" ? "database-not-found" :
      "database-check-failed";
    state.connected = false;
    state.schemaReady = false;
  }

  return {
    pool,
    state,
    close: async () => { await pool.end(); }
  };
}
