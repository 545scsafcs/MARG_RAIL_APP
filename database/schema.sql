-- MARG SQLite Database Schema (SIH26027)

CREATE TABLE IF NOT EXISTS trains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT UNIQUE NOT NULL,
    train_name TEXT NOT NULL,
    train_type TEXT NOT NULL, -- Vande Bharat, Shatabdi, Rajdhani, Superfast, Express, Freight
    source_station TEXT NOT NULL,
    destination_station TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    run_days TEXT,
    section_id TEXT,
    priority TEXT DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
    traffic_level TEXT DEFAULT 'NORMAL',
    data_source TEXT DEFAULT 'DEMO'
);

CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    division TEXT,
    zone TEXT,
    latitude REAL,
    longitude REAL
);

CREATE TABLE IF NOT EXISTS train_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT NOT NULL,
    station_code TEXT NOT NULL,
    station_name TEXT NOT NULL,
    arrival_time TEXT,
    departure_time TEXT,
    sequence INTEGER NOT NULL,
    distance REAL DEFAULT 0.0,
    FOREIGN KEY (train_number) REFERENCES trains(train_number),
    FOREIGN KEY (station_code) REFERENCES stations(station_code)
);

CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id TEXT UNIQUE NOT NULL,
    section_name TEXT NOT NULL,
    from_station TEXT NOT NULL,
    to_station TEXT NOT NULL,
    distance REAL DEFAULT 0.0,
    route TEXT,
    status TEXT DEFAULT 'ACTIVE',
    traffic_level TEXT DEFAULT 'MEDIUM',
    asset_health INTEGER DEFAULT 85
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT UNIQUE NOT NULL,
    asset_type TEXT NOT NULL, -- Track, Bridge, OHE, Signal, Telecom, Electrical
    asset_name TEXT NOT NULL,
    section_id TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'OPERATIONAL', -- OPERATIONAL, DEGRADED, CRITICAL, MAINTENANCE
    health_score REAL DEFAULT 100.0,
    criticality TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    open_defects INTEGER DEFAULT 0,
    last_inspection TEXT,
    next_due TEXT,
    availability_status TEXT DEFAULT 'AVAILABLE',
    FOREIGN KEY (section_id) REFERENCES sections(section_id)
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT UNIQUE NOT NULL,
    asset_id TEXT NOT NULL,
    department TEXT NOT NULL, -- Engineering, OHE, Signal, Telecom, Electrical
    task_type TEXT NOT NULL,
    description TEXT,
    issue TEXT,
    severity INTEGER DEFAULT 1,
    safety_risk INTEGER DEFAULT 20,
    urgency INTEGER DEFAULT 50,
    overdue_days INTEGER DEFAULT 0,
    asset_criticality INTEGER DEFAULT 60,
    priority TEXT DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
    priority_score INTEGER DEFAULT 50,
    priority_reason TEXT,
    estimated_duration INTEGER NOT NULL, -- minutes
    required_crew INTEGER DEFAULT 1,
    required_equipment TEXT,
    earliest_start TEXT,
    latest_finish TEXT,
    due_minute INTEGER DEFAULT 1440,
    due_date TEXT,
    section_id TEXT NOT NULL,
    contractor_id TEXT DEFAULT 'CRW-ENG-01',
    status TEXT DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, PAUSED, COMPLETED, SUBMITTED_FOR_APPROVAL, APPROVED, REJECTED, DELAYED, CANCELLED
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
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
    FOREIGN KEY (section_id) REFERENCES sections(section_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_code TEXT UNIQUE NOT NULL,
    department_name TEXT NOT NULL,
    color_code TEXT
);

CREATE TABLE IF NOT EXISTS crews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id TEXT UNIQUE NOT NULL,
    crew_name TEXT NOT NULL,
    department TEXT NOT NULL,
    type TEXT DEFAULT 'TRACK_CREW',
    skills TEXT DEFAULT 'TRACK_REPAIR',
    section_id TEXT,
    available_from INTEGER DEFAULT 0,
    available_until INTEGER DEFAULT 1440,
    status TEXT DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, IN_USE, UNAVAILABLE, MAINTENANCE, OFF_DUTY
    current_assignment TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    window_id TEXT UNIQUE NOT NULL,
    section_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    train_density TEXT DEFAULT 'LOW',
    status TEXT DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT UNIQUE NOT NULL,
    section_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    start_minute INTEGER NOT NULL,
    end_minute INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    block_type TEXT NOT NULL, -- JOINT, MAINTENANCE, EMERGENCY
    departments_json TEXT NOT NULL, -- JSON array of departments
    trains_affected_json TEXT, -- JSON array of train numbers
    disruption_score REAL DEFAULT 0.0,
    availability_improvement REAL DEFAULT 0.0,
    status TEXT DEFAULT 'PROPOSED' -- PROPOSED, APPROVED, REJECTED, IN_PROGRESS, COMPLETED
);

CREATE TABLE IF NOT EXISTS block_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    FOREIGN KEY (block_id) REFERENCES blocks(block_id),
    FOREIGN KEY (task_id) REFERENCES maintenance_tasks(task_id)
);

CREATE TABLE IF NOT EXISTS train_impacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id TEXT NOT NULL,
    train_number TEXT NOT NULL,
    train_name TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    block_overlap_mins INTEGER DEFAULT 0,
    action TEXT NOT NULL, -- PASS, HOLD, DIVERT, RESCHEDULE
    expected_hold_mins INTEGER DEFAULT 0,
    expected_delay_mins INTEGER DEFAULT 0,
    diversion_route TEXT,
    reason TEXT NOT NULL,
    FOREIGN KEY (block_id) REFERENCES blocks(block_id)
);

CREATE TABLE IF NOT EXISTS optimization_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    mode TEXT DEFAULT 'STANDARD',
    result_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL, -- CSV, JSON, DEMO
    status TEXT NOT NULL, -- CONNECTED, ERROR, NOT_CONFIGURED
    last_sync TEXT,
    records_count INTEGER DEFAULT 0,
    details TEXT
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL, -- SUCCESS, FAILED
    records_imported INTEGER DEFAULT 0,
    message TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- ADMIN, CONTROL_OFFICER, MAINTENANCE_CONTRACTOR
    department TEXT,
    contractor_company TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    timestamp TEXT NOT NULL,
    details TEXT
);

CREATE TABLE IF NOT EXISTS ai_analysis_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tools_called TEXT,
    response TEXT NOT NULL
);

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
