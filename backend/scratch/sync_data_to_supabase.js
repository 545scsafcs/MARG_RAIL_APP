import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database/marg.db');
const connectionString = 'postgresql://postgres.tkckyjyjuxtxakknetdx:Vineet1233%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sqliteDb = new sqlite3.Database(dbPath);
const pgPool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'sections', 'stations', 'trains', 'train_stops', 'assets',
  'maintenance_tasks', 'departments', 'crews', 'maintenance_windows',
  'blocks', 'block_tasks', 'train_impacts', 'optimization_runs',
  'data_sources', 'sync_logs', 'users', 'audit_logs',
  'ai_analysis_logs', 'work_evidence'
];

async function batchInsert(table, rows) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  const cols = Object.keys(rows[0]);
  const colNames = cols.map(c => `"${c}"`).join(', ');

  const chunkSize = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];
    let paramIndex = 1;

    for (const row of chunk) {
      const rowPlaceholders = [];
      for (const col of cols) {
        rowPlaceholders.push(`$${paramIndex++}`);
        params.push(row[col]);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const sql = `INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING`;
    try {
      const res = await pgPool.query(sql, params);
      inserted += res.rowCount || 0;
    } catch (err) {
      console.error(`Batch error on '${table}' chunk ${i}:`, err.message);
    }
  }

  return { inserted, total: rows.length };
}

async function sync() {
  console.log('=== BATCH SYNCING DATA FROM LOCAL SQLITE TO SUPABASE POSTGRESQL ===');
  for (const table of tables) {
    const rows = await new Promise((resolve) => {
      sqliteDb.all(`SELECT * FROM "${table}"`, (err, res) => {
        if (err) resolve([]);
        else resolve(res || []);
      });
    });

    if (rows.length === 0) {
      console.log(`Table '${table}': 0 rows in SQLite, skipping.`);
      continue;
    }

    const res = await batchInsert(table, rows);
    console.log(`Table '${table}': ${res.total} total rows | ${res.inserted} newly inserted into Supabase`);
  }

  await pgPool.end();
  sqliteDb.close();
  console.log('=== SYNC COMPLETED SUCCESSFULLY ===');
}

sync().catch(err => {
  console.error('Sync error:', err);
  pgPool.end();
});
