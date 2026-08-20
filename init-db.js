const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    action TEXT,
    qty INTEGER,
    amount REAL,
    note TEXT,
    created_at TEXT NOT NULL
  )`);

  const sample = db.prepare(`INSERT INTO sales (amount, note, created_at) VALUES (?, ?, ?)`);
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  sample.run(1200, 'Daily sales sample', `${today} 09:15:00`);
  sample.run(4500, 'Monthly batch', `${today} 12:30:00`);
  sample.run(9000, 'Yearly order', `${today} 15:45:00`);
  sample.finalize();

  const activitySample = db.prepare(`INSERT INTO activity_logs (role, action, qty, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  activitySample.run('staff', '5-Gallon Water Refill', 12, 240, 'Walk-in sale sample', `${today} 09:20:00`);
  activitySample.finalize();
});


db.close();
