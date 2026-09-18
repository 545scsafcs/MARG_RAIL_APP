import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sqlitePath = path.join(rootDir, 'database', 'marg.db');
const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  console.log('====================================================');
  console.log('MARG SQLite -> Supabase PostgreSQL Migration Tool');
  console.log('====================================================\n');

  if (!fs.existsSync(sqlitePath)) {
    console.error(`[ERROR] SQLite database not found at: ${sqlitePath}`);
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error('[ERROR] DATABASE_URL environment variable is not defined.');
    console.error('Please set DATABASE_URL (e.g. postgresql://user:pass@ep-xxx.supabase.co/postgres) and try again.');
    process.exit(1);
  }

  console.log(`Source SQLite DB: ${sqlitePath}`);
  console.log(`Target PostgreSQL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const sqliteDb = new sqlite3.Database(sqlitePath);
  const pgClient = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pgClient.connect();
  console.log('[PostgreSQL] Connected successfully.\n');

  const tables = [
    'sections', 'stations', 'trains', 'train_stops', 'assets',
    'maintenance_tasks', 'departments', 'crews', 'maintenance_windows',
    'blocks', 'block_tasks', 'train_impacts', 'optimization_runs',
    'data_sources', 'sync_logs', 'users', 'audit_logs',
    'ai_analysis_logs', 'work_evidence'
  ];

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const table of tables) {
    try {
      const rows = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, (err, res) => {
          if (err) resolve([]);
          else resolve(res || []);
        });
      });

      if (rows.length === 0) {
        console.log(`Table '${table}': 0 records found in SQLite.`);
        continue;
      }

      let inserted = 0;
      let skipped = 0;
      let errors = 0;

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colList = columns.join(', ');

        const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        try {
          const res = await pgClient.query(sql, values);
          if (res.rowCount > 0) inserted++;
          else skipped++;
        } catch (rowErr) {
          errors++;
        }
      }

      console.log(`Table '${table}': ${rows.length} total | ${inserted} inserted | ${skipped} skipped (exists) | ${errors} errors`);
      totalMigrated += inserted;
      totalSkipped += skipped;
      totalErrors += errors;
    } catch (tblErr) {
      console.error(`[ERROR] Table '${table}' migration failed:`, tblErr.message);
    }
  }

  console.log('\n====================================================');
  console.log('MIGRATION SUMMARY');
  console.log(`Total Records Inserted: ${totalMigrated}`);
  console.log(`Total Records Skipped:  ${totalSkipped}`);
  console.log(`Total Errors Encountered:${totalErrors}`);
  console.log('====================================================\n');

  sqliteDb.close();
  await pgClient.end();
}

runMigration().catch(err => {
  console.error('[FATAL] Migration script error:', err);
  process.exit(1);
});
