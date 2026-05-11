const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sentinel.db');
const db = new Database(dbPath);

console.log('Creating service_status table...');
db.exec(`
    CREATE TABLE IF NOT EXISTS service_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        status TEXT DEFAULT 'OK',
        error_message TEXT DEFAULT '',
        last_checked TEXT DEFAULT '',
        resolved_by TEXT DEFAULT '',
        resolution_notes TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
    )
`);

console.log('Inserting initial service records...');
const insertStmt = db.prepare(`
    INSERT INTO service_status (service_name, status, last_checked, updated_at)
    VALUES (?, 'OK', datetime('now'), datetime('now'))
`);

const services = ['service-auth', 'service-payment', 'service-inventory'];
const insertMany = db.transaction((services) => {
    for (const service of services) {
        insertStmt.run(service);
    }
});

insertMany(services);

console.log('✅ Database ready!');

const rows = db.prepare('SELECT * FROM service_status').all();
console.log('Current records:', rows);

db.close();