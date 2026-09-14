-- Initial Seed Data for MARG Database (SIH26027)

INSERT OR IGNORE INTO departments (department_code, department_name, color_code) VALUES
('ENG', 'Engineering', '#3B82F6'),
('OHE', 'Overhead Equipment (OHE)', '#EAB308'),
('SIG', 'Signal & Telecom', '#10B981'),
('TEL', 'Telecom', '#06B6D4'),
('ELE', 'Electrical', '#F97316');

INSERT OR IGNORE INTO data_sources (source_name, source_type, status, last_sync, records_count, details) VALUES
('Manual CSV / JSON Import', 'CSV', 'CONNECTED', CURRENT_TIMESTAMP, 50, 'Local railway timetable and maintenance dataset provider'),
('Synthetic Demo Dataset', 'DEMO', 'CONNECTED', CURRENT_TIMESTAMP, 50, 'Built-in baseline demo data for testing and validation');

INSERT OR IGNORE INTO users (username, password_hash, name, role, department, contractor_company, created_at) VALUES
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'System Administrator', 'ADMIN', 'Control Office HQ', 'Indian Railways Control Office', CURRENT_TIMESTAMP),
('officer', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Control Officer Sharma', 'CONTROL_OFFICER', 'Northern Division Operations', 'Northern Railway Control', CURRENT_TIMESTAMP),
('contractor', '2ba79f170c0c660424a1d48c909e7d9760775d7b5726715f22f7a935532a0c4f', 'Northern Track Maintenance Ltd', 'MAINTENANCE_CONTRACTOR', 'Engineering & Track Repair', 'Northern Track Maintenance Ltd', CURRENT_TIMESTAMP);
