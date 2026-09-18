import sqlite3 from 'sqlite3';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database/marg.db');
const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
const seedPath = path.resolve(__dirname, '../../database/seed.sql');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const DATABASE_URL = process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (DATABASE_URL) {
  console.log('[MARG Database] Connecting to PostgreSQL Database via DATABASE_URL...');
  pgPool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('[MARG Database] Using local SQLite database:', dbPath);
  sqliteDb = new sqlite3.Database(dbPath);
  sqliteDb.configure('busyTimeout', 5000);
}

/**
 * Convert SQLite ? placeholders and dialect constructs to PostgreSQL $1, $2, ...
 */
function convertSqlForPg(sql) {
  let paramIndex = 1;
  let isIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(sql);
  let isReplace = /INSERT\s+OR\s+REPLACE\s+INTO/i.test(sql);

  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

  pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  pgSql = pgSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
  pgSql = pgSql.replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN');
  pgSql = pgSql.replace(/PRINTF\('%02d',\s*([^)]+)\)/gi, 'LPAD(($1)::text, 2, \'0\')');

  if (isIgnore && !/ON\s+CONFLICT/i.test(pgSql)) {
    pgSql += ' ON CONFLICT DO NOTHING';
  }

  return pgSql;
}

export const dbAll = (sql, params = []) => {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    return pgPool.query(pgSql, params).then(res => res.rows);
  }
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export const dbGet = (sql, params = []) => {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    return pgPool.query(pgSql, params).then(res => res.rows[0] || null);
  }
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

export const dbRun = (sql, params = []) => {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    const returningSql = /INSERT/i.test(pgSql) && !/RETURNING/i.test(pgSql)
      ? `${pgSql} RETURNING id`
      : pgSql;

    return pgPool.query(returningSql, params).then(res => ({
      id: res.rows[0]?.id || null,
      changes: res.rowCount || 0
    }));
  }
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbExec = (sql) => {
  if (pgPool) {
    const pgSql = convertSqlForPg(sql);
    return pgPool.query(pgSql).then(() => {});
  }
  return new Promise((resolve, reject) => {
    sqliteDb.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export async function initDatabase() {
  try {
    if (pgPool) {
      console.log('[MARG Database] Initializing PostgreSQL schema on Supabase...');
      await initPostgresSchema();
    } else {
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await dbExec(schemaSql);
      }

      const migrations = [
        `ALTER TABLE users ADD COLUMN contractor_company TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN work_progress INTEGER DEFAULT 0`,
        `ALTER TABLE maintenance_tasks ADD COLUMN execution_summary TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN delay_reason TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN contractor_id TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN start_time TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN end_time TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN completion_evidence TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN remarks TEXT`,
        `ALTER TABLE assets ADD COLUMN required_resources TEXT`,
        `ALTER TABLE assets ADD COLUMN maintenance_window TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN rejection_reason TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN submitted_at TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN reviewed_by TEXT`,
        `ALTER TABLE maintenance_tasks ADD COLUMN reviewed_at TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN user_id TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN user_role TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN entity_type TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN entity_id TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN action TEXT`,
        `ALTER TABLE audit_logs ADD COLUMN details TEXT`,
        `ALTER TABLE blocks ADD COLUMN scheduled_date TEXT`,
        `ALTER TABLE work_evidence ADD COLUMN ohe_pole_number TEXT`
      ];

      for (const m of migrations) {
        await dbRun(m).catch(() => {});
      }

      await dbExec(`
        CREATE TABLE IF NOT EXISTS work_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id TEXT UNIQUE NOT NULL,
          task_id TEXT NOT NULL,
          asset_id TEXT,
          section_id TEXT,
          uploaded_by TEXT NOT NULL,
          user_role TEXT NOT NULL,
          category TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_hash TEXT NOT NULL,
          progress_percentage INTEGER DEFAULT 0,
          evidence_notes TEXT,
          ohe_pole_number TEXT,
          timestamp TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING_VERIFICATION',
          exif_json TEXT
        );
      `).catch((err) => console.error('[DB] Evidence table error:', err.message));

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf-8');
        await dbExec(seedSql);
      }

      const trainCount = await dbGet('SELECT COUNT(*) as count FROM trains');
      if (!trainCount || trainCount.count === 0) {
        await seedSyntheticData();
      }
    }

    await seedCorridorBlocks();
    console.log('[MARG Database] Initialized successfully.');
  } catch (err) {
    console.error('[MARG Database] Initialization error:', err);
  }
}

async function initPostgresSchema() {
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS trains (
        id SERIAL PRIMARY KEY,
        train_number TEXT UNIQUE NOT NULL,
        train_name TEXT NOT NULL,
        train_type TEXT NOT NULL,
        source_station TEXT NOT NULL,
        destination_station TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        arrival_time TEXT NOT NULL,
        run_days TEXT,
        section_id TEXT,
        priority TEXT DEFAULT 'MEDIUM',
        traffic_level TEXT DEFAULT 'NORMAL',
        data_source TEXT DEFAULT 'DEMO'
    );`,
    `CREATE TABLE IF NOT EXISTS stations (
        id SERIAL PRIMARY KEY,
        station_code TEXT UNIQUE NOT NULL,
        station_name TEXT NOT NULL,
        division TEXT,
        zone TEXT,
        latitude REAL,
        longitude REAL
    );`,
    `CREATE TABLE IF NOT EXISTS train_stops (
        id SERIAL PRIMARY KEY,
        train_number TEXT NOT NULL,
        station_code TEXT NOT NULL,
        station_name TEXT NOT NULL,
        arrival_time TEXT,
        departure_time TEXT,
        sequence INTEGER NOT NULL,
        distance REAL DEFAULT 0.0
    );`,
    `CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        section_id TEXT UNIQUE NOT NULL,
        section_name TEXT NOT NULL,
        from_station TEXT NOT NULL,
        to_station TEXT NOT NULL,
        distance REAL DEFAULT 0.0,
        route TEXT,
        status TEXT DEFAULT 'ACTIVE',
        traffic_level TEXT DEFAULT 'MEDIUM',
        asset_health INTEGER DEFAULT 85
    );`,
    `CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        asset_id TEXT UNIQUE NOT NULL,
        asset_type TEXT NOT NULL,
        asset_name TEXT NOT NULL,
        section_id TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'OPERATIONAL',
        health_score REAL DEFAULT 100.0,
        criticality TEXT DEFAULT 'MEDIUM',
        open_defects INTEGER DEFAULT 0,
        last_inspection TEXT,
        next_due TEXT,
        availability_status TEXT DEFAULT 'AVAILABLE',
        required_resources TEXT,
        maintenance_window TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id SERIAL PRIMARY KEY,
        task_id TEXT UNIQUE NOT NULL,
        asset_id TEXT NOT NULL,
        department TEXT NOT NULL,
        task_type TEXT NOT NULL,
        description TEXT,
        issue TEXT,
        severity INTEGER DEFAULT 1,
        safety_risk INTEGER DEFAULT 20,
        urgency INTEGER DEFAULT 50,
        overdue_days INTEGER DEFAULT 0,
        asset_criticality INTEGER DEFAULT 60,
        priority TEXT DEFAULT 'MEDIUM',
        priority_score INTEGER DEFAULT 50,
        priority_reason TEXT,
        estimated_duration INTEGER NOT NULL,
        required_crew INTEGER DEFAULT 1,
        required_equipment TEXT,
        earliest_start TEXT,
        latest_finish TEXT,
        due_minute INTEGER DEFAULT 1440,
        due_date TEXT,
        section_id TEXT NOT NULL,
        contractor_id TEXT DEFAULT 'CRW-ENG-01',
        status TEXT DEFAULT 'PENDING',
        actual_start_time TEXT,
        actual_end_time TEXT,
        total_work_duration INTEGER DEFAULT 0,
        delay_duration INTEGER DEFAULT 0,
        remarks TEXT,
        evidence_json TEXT,
        submitted_at TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        rejection_reason TEXT,
        work_progress INTEGER DEFAULT 0,
        execution_summary TEXT,
        delay_reason TEXT,
        start_time TEXT,
        end_time TEXT,
        completion_evidence TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        department_code TEXT UNIQUE NOT NULL,
        department_name TEXT NOT NULL,
        color_code TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS crews (
        id SERIAL PRIMARY KEY,
        crew_id TEXT UNIQUE NOT NULL,
        crew_name TEXT NOT NULL,
        department TEXT NOT NULL,
        type TEXT DEFAULT 'TRACK_CREW',
        skills TEXT DEFAULT 'TRACK_REPAIR',
        section_id TEXT,
        available_from INTEGER DEFAULT 0,
        available_until INTEGER DEFAULT 1440,
        status TEXT DEFAULT 'AVAILABLE',
        current_assignment TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS maintenance_windows (
        id SERIAL PRIMARY KEY,
        window_id TEXT UNIQUE NOT NULL,
        section_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        train_density TEXT DEFAULT 'LOW',
        status TEXT DEFAULT 'AVAILABLE'
    );`,
    `CREATE TABLE IF NOT EXISTS blocks (
        id SERIAL PRIMARY KEY,
        block_id TEXT UNIQUE NOT NULL,
        section_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        start_minute INTEGER NOT NULL,
        end_minute INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL,
        block_type TEXT NOT NULL,
        departments_json TEXT NOT NULL,
        trains_affected_json TEXT,
        disruption_score REAL DEFAULT 0.0,
        availability_improvement REAL DEFAULT 0.0,
        status TEXT DEFAULT 'PROPOSED',
        scheduled_date TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS block_tasks (
        id SERIAL PRIMARY KEY,
        block_id TEXT NOT NULL,
        task_id TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS train_impacts (
        id SERIAL PRIMARY KEY,
        block_id TEXT NOT NULL,
        train_number TEXT NOT NULL,
        train_name TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        block_overlap_mins INTEGER DEFAULT 0,
        action TEXT NOT NULL,
        expected_hold_mins INTEGER DEFAULT 0,
        expected_delay_mins INTEGER DEFAULT 0,
        diversion_route TEXT,
        reason TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS optimization_runs (
        id SERIAL PRIMARY KEY,
        run_id TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        mode TEXT DEFAULT 'STANDARD',
        result_json TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS data_sources (
        id SERIAL PRIMARY KEY,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        status TEXT NOT NULL,
        last_sync TEXT,
        records_count INTEGER DEFAULT 0,
        details TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        records_imported INTEGER DEFAULT 0,
        message TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT,
        contractor_company TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        timestamp TEXT NOT NULL,
        details TEXT,
        user_id TEXT,
        user_role TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS ai_analysis_logs (
        id SERIAL PRIMARY KEY,
        timestamp TEXT NOT NULL,
        prompt TEXT NOT NULL,
        tools_called TEXT,
        response TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS work_evidence (
        id SERIAL PRIMARY KEY,
        evidence_id TEXT UNIQUE NOT NULL,
        task_id TEXT NOT NULL,
        asset_id TEXT,
        section_id TEXT,
        uploaded_by TEXT NOT NULL,
        user_role TEXT NOT NULL,
        category TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash TEXT NOT NULL,
        progress_percentage INTEGER DEFAULT 0,
        evidence_notes TEXT,
        ohe_pole_number TEXT,
        timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING_VERIFICATION',
        exif_json TEXT
    );`
  ];

  for (const q of schemaQueries) {
    await pgPool.query(q).catch(err => console.error('[PG Init Error]:', err.message));
  }
}

async function seedSyntheticData() {
  console.log('[MARG Database] Seeding synthetic demo railway dataset...');

  const sections = [
    { section_id: 'SEC-A01', section_name: 'New Delhi - Ambala Central', from_station: 'NDLS', to_station: 'UMB', distance: 198.5, route: 'Northern Main Line', traffic_level: 'HIGH', asset_health: 82 },
    { section_id: 'SEC-A02', section_name: 'Ambala - Ludhiana Express Corridor', from_station: 'UMB', to_station: 'LDH', distance: 114.2, route: 'Northern Main Line', traffic_level: 'HIGH', asset_health: 78 },
    { section_id: 'SEC-B01', section_name: 'Kanpur - Lucknow Main Quad', from_station: 'CNB', to_station: 'LKO', distance: 72.0, route: 'North Central Grid', traffic_level: 'CRITICAL', asset_health: 69 },
    { section_id: 'SEC-B02', section_name: 'Lucknow - Gorakhpur Trunk', from_station: 'LKO', to_station: 'GKP', distance: 270.4, route: 'North Eastern Corridor', traffic_level: 'MEDIUM', asset_health: 88 },
    { section_id: 'SEC-C01', section_name: 'Mathura - Agra Cantt Heavy Rail', from_station: 'MTJ', to_station: 'AGC', distance: 54.0, route: 'Central Corridor', traffic_level: 'CRITICAL', asset_health: 74 }
  ];

  for (const s of sections) {
    await dbRun(
      `INSERT OR IGNORE INTO sections (section_id, section_name, from_station, to_station, distance, route, traffic_level, asset_health)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.section_id, s.section_name, s.from_station, s.to_station, s.distance, s.route, s.traffic_level, s.asset_health]
    );
  }
}

export async function seedCorridorBlocks() {
  const defaultBlocks = [
    { id: 'MARG-BLK-001', sec: 'SEC-A01', date: '2026-09-02', start_time: '02:00', end_time: '04:30', start_m: 120, end_m: 270, type: 'JOINT', depts: ['Engineering', 'Overhead Equipment (OHE)'], status: 'APPROVED' },
    { id: 'MARG-BLK-002', sec: 'SEC-B01', date: '2026-09-05', start_time: '01:30', end_time: '04:00', start_m: 90, end_m: 240, type: 'JOINT', depts: ['Signal & Telecom', 'Electrical'], status: 'APPROVED' },
    { id: 'MARG-BLK-003', sec: 'SEC-C01', date: '2026-09-08', start_time: '03:00', end_time: '05:30', start_m: 180, end_m: 330, type: 'JOINT', depts: ['Engineering', 'Signal & Telecom'], status: 'PROPOSED' }
  ];

  for (const b of defaultBlocks) {
    await dbRun(
      `INSERT OR REPLACE INTO blocks (block_id, section_id, scheduled_date, start_time, end_time, start_minute, end_minute, duration_minutes, block_type, departments_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.sec, b.date, b.start_time, b.end_time, b.start_m, b.end_m, b.end_m - b.start_m, b.type, JSON.stringify(b.depts), b.status]
    );
  }

  await dbRun(`UPDATE blocks SET scheduled_date = '2026-09-' || PRINTF('%02d', ((id % 25) + 1)) WHERE scheduled_date IS NULL OR scheduled_date = ''`).catch(() => {});
  console.log('[MARG Database] Corridor blocks verified.');
}
