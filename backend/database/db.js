import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database/marg.db');
const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
const seedPath = path.resolve(__dirname, '../../database/seed.sql');

// Ensure parent dir exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);
db.configure('busyTimeout', 5000);

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbExec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export async function initDatabase() {
  try {
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await dbExec(schemaSql);
    }

    // Dynamic column migrations for existing SQLite database
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

    // Ensure work_evidence table exists
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

    // Seed synthetic trains if empty
    const trainCount = await dbGet('SELECT COUNT(*) as count FROM trains');
    if (!trainCount || trainCount.count === 0) {
      await seedSyntheticData();
    }

    // Always ensure corridor blocks exist in database
    await seedCorridorBlocks();

    console.log('[MARG Database] Initialized successfully.');
  } catch (err) {
    console.error('[MARG Database] Initialization error:', err);
  }
}

async function seedSyntheticData() {
  console.log('[MARG Database] Seeding synthetic demo railway dataset...');

  // 15 Sections
  const sections = [
    { section_id: 'SEC-A01', section_name: 'New Delhi - Ambala Central', from_station: 'NDLS', to_station: 'UMB', distance: 198.5, route: 'Northern Main Line', traffic_level: 'HIGH', asset_health: 82 },
    { section_id: 'SEC-A02', section_name: 'Ambala - Ludhiana Express Corridor', from_station: 'UMB', to_station: 'LDH', distance: 114.2, route: 'Northern Main Line', traffic_level: 'HIGH', asset_health: 78 },
    { section_id: 'SEC-B01', section_name: 'Kanpur - Lucknow Main Quad', from_station: 'CNB', to_station: 'LKO', distance: 72.0, route: 'North Central Grid', traffic_level: 'CRITICAL', asset_health: 69 },
    { section_id: 'SEC-B02', section_name: 'Lucknow - Gorakhpur Trunk', from_station: 'LKO', to_station: 'GKP', distance: 270.4, route: 'North Eastern Corridor', traffic_level: 'MEDIUM', asset_health: 88 },
    { section_id: 'SEC-C01', section_name: 'Mathura - Agra Cantt Heavy Rail', from_station: 'MTJ', to_station: 'AGC', distance: 54.0, route: 'Central Corridor', traffic_level: 'CRITICAL', asset_health: 74 },
    { section_id: 'SEC-C02', section_name: 'Agra - Gwalior High Speed Sub-segment', from_station: 'AGC', to_station: 'GWL', distance: 118.6, route: 'Central Corridor', traffic_level: 'HIGH', asset_health: 91 },
    { section_id: 'SEC-D01', section_name: 'Moradabad - Bareilly Link', from_station: 'MB', to_station: 'BE', distance: 90.0, route: 'Northern Loop', traffic_level: 'MEDIUM', asset_health: 84 },
    { section_id: 'SEC-D02', section_name: 'Bareilly - Lucknow North Line', from_station: 'BE', to_station: 'LKO', distance: 235.0, route: 'Northern Loop', traffic_level: 'MEDIUM', asset_health: 80 },
    { section_id: 'SEC-E01', section_name: 'Delhi Anand Vihar - Ghaziabad', from_station: 'ANVT', to_station: 'GZB', distance: 13.0, route: 'NCR Suburban Belt', traffic_level: 'CRITICAL', asset_health: 62 },
    { section_id: 'SEC-E02', section_name: 'Ghaziabad - Meerut Cantt', from_station: 'GZB', to_station: 'MUT', distance: 48.0, route: 'NCR North', traffic_level: 'HIGH', asset_health: 86 },
    { section_id: 'SEC-F01', section_name: 'Jaipur - Alwar Connection', from_station: 'JP', to_station: 'AWR', distance: 151.0, route: 'North Western Grid', traffic_level: 'MEDIUM', asset_health: 89 },
    { section_id: 'SEC-F02', section_name: 'Alwar - Rewari Junction', from_station: 'AWR', to_station: 'RE', distance: 75.0, route: 'North Western Grid', traffic_level: 'MEDIUM', asset_health: 85 },
    { section_id: 'SEC-G01', section_name: 'Varanasi - Prayagraj Rambagh', from_station: 'BSB', to_station: 'PRYJ', distance: 124.0, route: 'Eastern Feeder', traffic_level: 'HIGH', asset_health: 76 },
    { section_id: 'SEC-G02', section_name: 'Prayagraj - Kanpur Central Heavy Freight', from_station: 'PRYJ', to_station: 'CNB', distance: 194.0, route: 'DFC Bypass Line', traffic_level: 'CRITICAL', asset_health: 71 },
    { section_id: 'SEC-H01', section_name: 'Saharanpur - Ambala Bypass', from_station: 'SRE', to_station: 'UMB', distance: 81.0, route: 'Northern Bypass', traffic_level: 'LOW', asset_health: 93 }
  ];

  for (const s of sections) {
    await dbRun(
      `INSERT OR IGNORE INTO sections (section_id, section_name, from_station, to_station, distance, route, traffic_level, asset_health)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.section_id, s.section_name, s.from_station, s.to_station, s.distance, s.route, s.traffic_level, s.asset_health]
    );
  }

  // 20 Stations
  const stations = [
    { code: 'NDLS', name: 'New Delhi Central', zone: 'NR', division: 'Delhi' },
    { code: 'UMB', name: 'Ambala Cantt Junction', zone: 'NR', division: 'Ambala' },
    { code: 'LDH', name: 'Ludhiana Junction', zone: 'NR', division: 'Firozpur' },
    { code: 'CNB', name: 'Kanpur Central', zone: 'NCR', division: 'Prayagraj' },
    { code: 'LKO', name: 'Lucknow Charbagh', zone: 'NR', division: 'Lucknow' },
    { code: 'GKP', name: 'Gorakhpur Junction', zone: 'NER', division: 'Lucknow' },
    { code: 'MTJ', name: 'Mathura Junction', zone: 'NCR', division: 'Agra' },
    { code: 'AGC', name: 'Agra Cantt', zone: 'NCR', division: 'Agra' },
    { code: 'GWL', name: 'Gwalior Junction', zone: 'NCR', division: 'Jhansi' },
    { code: 'MB', name: 'Moradabad Junction', zone: 'NR', division: 'Moradabad' },
    { code: 'BE', name: 'Bareilly Junction', zone: 'NR', division: 'Moradabad' },
    { code: 'ANVT', name: 'Anand Vihar Terminal', zone: 'NR', division: 'Delhi' },
    { code: 'GZB', name: 'Ghaziabad Junction', zone: 'NR', division: 'Delhi' },
    { code: 'MUT', name: 'Meerut Cantt', zone: 'NR', division: 'Delhi' },
    { code: 'JP', name: 'Jaipur Junction', zone: 'NWR', division: 'Jaipur' },
    { code: 'AWR', name: 'Alwar Junction', zone: 'NWR', division: 'Jaipur' },
    { code: 'RE', name: 'Rewari Junction', zone: 'NWR', division: 'Jaipur' },
    { code: 'BSB', name: 'Varanasi Junction', zone: 'NR', division: 'Lucknow' },
    { code: 'PRYJ', name: 'Prayagraj Junction', zone: 'NCR', division: 'Prayagraj' },
    { code: 'SRE', name: 'Saharanpur Junction', zone: 'NR', division: 'Ambala' }
  ];

  for (const st of stations) {
    await dbRun(
      `INSERT OR IGNORE INTO stations (station_code, station_name, zone, division) VALUES (?, ?, ?, ?)`,
      [st.code, st.name, st.zone, st.division]
    );
  }

  // 50 Trains
  const trainTypes = ['Vande Bharat', 'Shatabdi Express', 'Rajdhani Express', 'Superfast Express', 'Mail/Express', 'Freight DFC Special', 'Suburban Passenger'];
  const trainList = [
    { num: '22436', name: 'Vande Bharat Express', type: 'Vande Bharat', src: 'NDLS', dst: 'BSB', arr: '06:00', dep: '06:15', sec: 'SEC-A01', prio: 'HIGH' },
    { num: '12002', name: 'Bhopal Shatabdi Express', type: 'Shatabdi Express', src: 'NDLS', dst: 'RKMP', arr: '06:00', dep: '06:10', sec: 'SEC-C01', prio: 'HIGH' },
    { num: '12952', name: 'Mumbai Rajdhani Express', type: 'Rajdhani Express', src: 'NDLS', dst: 'MMCT', arr: '16:55', dep: '17:10', sec: 'SEC-C01', prio: 'HIGH' },
    { num: '12004', name: 'Lucknow Shatabdi Express', type: 'Shatabdi Express', src: 'NDLS', dst: 'LKO', arr: '06:10', dep: '06:25', sec: 'SEC-E01', prio: 'HIGH' },
    { num: '12424', name: 'Dibrugarh Rajdhani Express', type: 'Rajdhani Express', src: 'NDLS', dst: 'DBRG', arr: '16:20', dep: '16:35', sec: 'SEC-E01', prio: 'HIGH' },
    { num: '12011', name: 'Kalka Shatabdi Express', type: 'Shatabdi Express', src: 'NDLS', dst: 'KLK', arr: '07:40', dep: '07:50', sec: 'SEC-A01', prio: 'HIGH' },
    { num: '12260', name: 'Sealdah Duronto Express', type: 'Superfast Express', src: 'NDLS', dst: 'SDAH', arr: '19:45', dep: '20:00', sec: 'SEC-B01', prio: 'HIGH' },
    { num: '12626', name: 'Kerala Express', type: 'Superfast Express', src: 'NDLS', dst: 'TVC', arr: '20:10', dep: '20:25', sec: 'SEC-C01', prio: 'MEDIUM' },
    { num: '12802', name: 'Purushottam Express', type: 'Superfast Express', src: 'NDLS', dst: 'PURI', arr: '22:40', dep: '22:55', sec: 'SEC-G02', prio: 'MEDIUM' },
    { num: '12398', name: 'Mahabodhi Express', type: 'Superfast Express', src: 'NDLS', dst: 'GAYA', arr: '12:50', dep: '13:05', sec: 'SEC-G02', prio: 'MEDIUM' },
    { num: '12556', name: 'Gorakhdham Express', type: 'Superfast Express', src: 'NDLS', dst: 'GKP', arr: '21:25', dep: '21:40', sec: 'SEC-B02', prio: 'MEDIUM' },
    { num: '12418', name: 'Prayagraj Express', type: 'Superfast Express', src: 'NDLS', dst: 'PRYJ', arr: '22:10', dep: '22:25', sec: 'SEC-G02', prio: 'HIGH' },
    { num: '12452', name: 'Shram Shakti Express', type: 'Superfast Express', src: 'NDLS', dst: 'CNB', arr: '23:55', dep: '00:10', sec: 'SEC-B01', prio: 'MEDIUM' },
    { num: '12280', name: 'Taj Express', type: 'Superfast Express', src: 'NDLS', dst: 'VGLJ', arr: '06:55', dep: '07:10', sec: 'SEC-C01', prio: 'MEDIUM' },
    { num: '12034', name: 'Kanpur Shatabdi Express', type: 'Shatabdi Express', src: 'NDLS', dst: 'CNB', arr: '15:50', dep: '16:05', sec: 'SEC-B01', prio: 'HIGH' },
    { num: '14206', name: 'Ayodhya Express', type: 'Mail/Express', src: 'DLI', dst: 'AY', arr: '18:20', dep: '18:35', sec: 'SEC-D02', prio: 'MEDIUM' },
    { num: '14042', name: 'Mussoorie Express', type: 'Mail/Express', src: 'DLI', dst: 'KTW', arr: '22:25', dep: '22:40', sec: 'SEC-D01', prio: 'LOW' },
    { num: '14316', name: 'Intercity Express', type: 'Mail/Express', src: 'NDLS', dst: 'BE', arr: '16:35', dep: '16:50', sec: 'SEC-D01', prio: 'MEDIUM' },
    { num: '12414', name: 'Pooja Superfast Express', type: 'Superfast Express', src: 'JAT', dst: 'AII', arr: '04:15', dep: '04:30', sec: 'SEC-F01', prio: 'MEDIUM' },
    { num: '12015', name: 'Ajmer Shatabdi Express', type: 'Shatabdi Express', src: 'NDLS', dst: 'AII', arr: '06:10', dep: '06:20', sec: 'SEC-F01', prio: 'HIGH' }
  ];

  // Generate up to 50 trains automatically
  for (let i = 1; i <= 50; i++) {
    const template = trainList[(i - 1) % trainList.length];
    const trainNum = String(10000 + i * 231);
    const arrHour = String((i * 3) % 24).padStart(2, '0');
    const depHour = String((i * 3 + 1) % 24).padStart(2, '0');
    const secId = `SEC-${['A01', 'A02', 'B01', 'B02', 'C01', 'C02', 'D01', 'D02', 'E01', 'E02', 'F01', 'F02', 'G01', 'G02', 'H01'][i % 15]}`;

    await dbRun(
      `INSERT OR IGNORE INTO trains (train_number, train_name, train_type, source_station, destination_station, departure_time, arrival_time, section_id, priority, traffic_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        i <= trainList.length ? template.num : trainNum,
        i <= trainList.length ? template.name : `Express Service #${i}`,
        i <= trainList.length ? template.type : trainTypes[i % trainTypes.length],
        template.src,
        template.dst,
        `${arrHour}:00`,
        `${depHour}:20`,
        secId,
        i % 4 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
        secId.includes('B01') || secId.includes('C01') ? 'CRITICAL' : 'NORMAL'
      ]
    );
  }

  // 35 Assets
  const assetTypes = ['Track', 'Bridge', 'OHE', 'Signal', 'Telecom', 'Electrical'];
  for (let a = 1; a <= 35; a++) {
    const assetId = `AST-${100 + a}`;
    const type = assetTypes[a % assetTypes.length];
    const secId = `SEC-${['A01', 'A02', 'B01', 'B02', 'C01', 'C02', 'D01', 'D02', 'E01', 'E02', 'F01', 'F02', 'G01', 'G02', 'H01'][a % 15]}`;
    const health = Math.max(45, 100 - (a * 7) % 55);
    const criticality = health < 60 ? 'CRITICAL' : health < 75 ? 'HIGH' : health < 85 ? 'MEDIUM' : 'LOW';
    const status = health < 60 ? 'CRITICAL' : health < 75 ? 'DEGRADED' : 'OPERATIONAL';

    await dbRun(
      `INSERT OR IGNORE INTO assets (asset_id, asset_type, asset_name, section_id, location, status, health_score, criticality, open_defects, last_inspection, next_due, availability_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assetId,
        type,
        `${type} Segment #${a} (${secId})`,
        secId,
        `KM ${a * 4 + 12}.5`,
        status,
        health,
        criticality,
        a % 3 === 0 ? 2 : a % 5 === 0 ? 1 : 0,
        '2026-08-15',
        '2026-09-15',
        status === 'CRITICAL' ? 'MAINTENANCE_DUE' : 'AVAILABLE'
      ]
    );
  }

  // 50 Maintenance Tasks
  const depts = ['Engineering', 'Overhead Equipment (OHE)', 'Signal & Telecom', 'Electrical'];
  const issues = [
    'Rail web stress fatigue & ultrasonic flaw detection',
    'OHE contact wire stagger realignment & insulator replacement',
    'Point machine interlocking contact cleaning & calibration',
    'Axle counter sensor sensitivity adjustment',
    'Track sleeper fastener tightening & ballast tamping',
    'Catenary tension regulator inspection',
    'Signal LED lamp matrix test and relay check',
    'Bridge pier vibration analysis and expansion joint repair'
  ];

  for (let t = 1; t <= 50; t++) {
    const taskId = `TSK-${1000 + t}`;
    const assetId = `AST-${100 + (t % 35 + 1)}`;
    const dept = depts[t % depts.length];
    const secId = `SEC-${['A01', 'A02', 'B01', 'B02', 'C01', 'C02', 'D01', 'D02', 'E01', 'E02', 'F01', 'F02', 'G01', 'G02', 'H01'][t % 15]}`;
    const severity = (t % 5) + 1;
    const safety = severity * 18;
    const urgency = 40 + (t * 9) % 55;
    const score = Math.min(98, Math.round(severity * 15 + safety * 0.3 + urgency * 0.4));
    const prioLevel = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

    const dayNum = String((t % 28) + 1).padStart(2, '0');
    const dueDate = `2026-09-${dayNum}`;

    await dbRun(
      `INSERT OR IGNORE INTO maintenance_tasks (task_id, asset_id, department, task_type, description, issue, severity, safety_risk, urgency, overdue_days, asset_criticality, priority, priority_score, priority_reason, estimated_duration, required_crew, section_id, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        assetId,
        dept,
        'CORRECTIVE_MAINTENANCE',
        issues[t % issues.length],
        issues[t % issues.length],
        severity,
        safety,
        urgency,
        t % 4 === 0 ? (t % 7) + 1 : 0,
        score,
        prioLevel,
        score,
        score >= 80 ? 'Safety-critical asset with elevated defect risk' : 'Routine planned grid maintenance',
        60 + (t % 3) * 30, // 60, 90, 120 mins
        2 + (t % 3),
        secId,
        dueDate,
        t % 6 === 0 ? 'IN_PROGRESS' : t % 8 === 0 ? 'COMPLETED' : 'PENDING'
      ]
    );
  }

  // Update any existing tasks without due_date
  await dbRun(`UPDATE maintenance_tasks SET due_date = '2026-09-' || PRINTF('%02d', ((id % 28) + 1)) WHERE due_date IS NULL OR due_date = ''`).catch(() => {});

  // Crews
  const crews = [
    { id: 'CRW-ENG-01', name: 'Delhi Track Gang Alpha', dept: 'Engineering', section: 'SEC-A01' },
    { id: 'CRW-OHE-01', name: 'Ambala OHE Tower Car Crew', dept: 'Overhead Equipment (OHE)', section: 'SEC-A01' },
    { id: 'CRW-SIG-01', name: 'Kanpur Signal Technicians', dept: 'Signal & Telecom', section: 'SEC-B01' },
    { id: 'CRW-ELE-01', name: 'Lucknow Power Maintenance Unit', dept: 'Electrical', section: 'SEC-B02' }
  ];

  for (const c of crews) {
    await dbRun(
      `INSERT OR IGNORE INTO crews (crew_id, crew_name, department, section_id, available_from, available_until)
       VALUES (?, ?, ?, ?, 0, 1440)`,
      [c.id, c.name, c.dept, c.section]
    );
  }

}

export async function seedCorridorBlocks() {
  const defaultBlocks = [
    { id: 'MARG-BLK-001', sec: 'SEC-A01', date: '2026-09-02', start_time: '02:00', end_time: '04:30', start_m: 120, end_m: 270, type: 'JOINT', depts: ['Engineering', 'Overhead Equipment (OHE)'], status: 'APPROVED' },
    { id: 'MARG-BLK-002', sec: 'SEC-B01', date: '2026-09-05', start_time: '01:30', end_time: '04:00', start_m: 90, end_m: 240, type: 'JOINT', depts: ['Signal & Telecom', 'Electrical'], status: 'APPROVED' },
    { id: 'MARG-BLK-003', sec: 'SEC-C01', date: '2026-09-08', start_time: '03:00', end_time: '05:30', start_m: 180, end_m: 330, type: 'JOINT', depts: ['Engineering', 'Signal & Telecom'], status: 'PROPOSED' },
    { id: 'MARG-BLK-004', sec: 'SEC-A02', date: '2026-09-12', start_time: '02:00', end_time: '05:00', start_m: 120, end_m: 300, type: 'JOINT', depts: ['Engineering', 'OHE', 'Electrical'], status: 'APPROVED' },
    { id: 'MARG-BLK-005', sec: 'SEC-E01', date: '2026-09-15', start_time: '01:00', end_time: '03:30', start_m: 60, end_m: 210, type: 'JOINT', depts: ['Engineering', 'Overhead Equipment (OHE)'], status: 'PROPOSED' },
    { id: 'MARG-BLK-006', sec: 'SEC-D01', date: '2026-09-18', start_time: '04:00', end_time: '06:30', start_m: 240, end_m: 390, type: 'JOINT', depts: ['Signal & Telecom'], status: 'APPROVED' },
    { id: 'MARG-BLK-007', sec: 'SEC-G02', date: '2026-09-22', start_time: '02:30', end_time: '05:00', start_m: 150, end_m: 300, type: 'JOINT', depts: ['Engineering', 'Electrical'], status: 'PROPOSED' },
    { id: 'MARG-BLK-008', sec: 'SEC-F01', date: '2026-09-25', start_time: '03:00', end_time: '05:00', start_m: 180, end_m: 300, type: 'JOINT', depts: ['OHE', 'Signal & Telecom'], status: 'APPROVED' },
    { id: 'MARG-BLK-009', sec: 'SEC-A01', date: '2026-09-28', start_time: '02:00', end_time: '04:30', start_m: 120, end_m: 270, type: 'JOINT', depts: ['Engineering', 'Overhead Equipment (OHE)'], status: 'PROPOSED' }
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
