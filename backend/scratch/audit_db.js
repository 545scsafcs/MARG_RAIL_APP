import pg from 'pg';

const connectionString = 'postgresql://postgres.tkckyjyjuxtxakknetdx:Vineet1233%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  console.log('--- SUPABASE POSTGRESQL TABLE AUDIT ---');
  const tablesRes = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  console.log('Public Tables found:', tableNames);

  console.log('\n--- ROW COUNTS ---');
  const counts = {};
  for (const table of tableNames) {
    try {
      const res = await pool.query(`SELECT COUNT(*) as c FROM "${table}"`);
      counts[table] = parseInt(res.rows[0].c, 10);
      console.log(`Table '${table}': ${counts[table]} rows`);
    } catch (err) {
      console.error(`Error querying table '${table}':`, err.message);
    }
  }

  console.log('\n--- RLS STATUS FOR PUBLIC TABLES ---');
  const rlsRes = await pool.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  for (const r of rlsRes.rows) {
    console.log(`Table '${r.tablename}': RLS Enabled = ${r.rowsecurity}`);
  }

  await pool.end();
}

audit().catch(err => {
  console.error('Audit failed:', err);
  pool.end();
});
