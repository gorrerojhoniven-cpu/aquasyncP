const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Unable to open database:', err.message);
    process.exit(1);
  }
});

// Ensure required tables exist so inserts won't fail if init-db.js wasn't run
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
    is_saved INTEGER DEFAULT 0,
    staff_id INTEGER,
    created_at TEXT NOT NULL
  )`);

  // Siguraduhing maidagdag ang 'is_saved' column kahit may umiiral nang data.db
  db.run(`ALTER TABLE activity_logs ADD COLUMN is_saved INTEGER DEFAULT 0`, () => {
    // Isasantabi ang error kung umiiral na ang column
  });

  // Add staff_id column if it doesn't exist
  db.run(`ALTER TABLE activity_logs ADD COLUMN staff_id INTEGER`, () => {
    // Isasantabi ang error kung umiiral na ang column
  });

  // Create staff accounts table - owner creates accounts, not staff
  db.run(`CREATE TABLE IF NOT EXISTS staff_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  // Create staff profiles table for profile photo and info
  db.run(`CREATE TABLE IF NOT EXISTS staff_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER UNIQUE NOT NULL,
    photo_data TEXT,
    photo_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(staff_id) REFERENCES staff_accounts(id)
  )`);
});

// Increase JSON payload limit to 50MB to support large image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/api/sales-summary', (req, res) => {
  const now = new Date();
  const queryDate = req.query.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [year, month, day] = queryDate.split('-');
  const safeYear = year && year.length === 4 ? year : String(now.getFullYear());
  const safeMonth = month && month.length === 2 ? month : String(now.getMonth() + 1).padStart(2, '0');
  const safeDay = day && day.length === 2 ? day : String(now.getDate()).padStart(2, '0');

  const dailyStart = `${safeYear}-${safeMonth}-${safeDay} 00:00:00`;
  const dailyEnd = `${safeYear}-${safeMonth}-${safeDay} 23:59:59`;
  const monthlyStart = `${safeYear}-${safeMonth}-01 00:00:00`;
  const yearlyStart = `${safeYear}-01-01 00:00:00`;

  const queries = {
    daily: `SELECT IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at BETWEEN ? AND ?`,
    monthly: `SELECT IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at BETWEEN ? AND ?`,
    yearly: `SELECT IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at BETWEEN ? AND ?`,
    summary: `SELECT COUNT(*) AS count, IFNULL(SUM(amount), 0) AS total FROM sales`
  };

  db.serialize(() => {
    db.get(queries.daily, [dailyStart, dailyEnd], (err, daily) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(queries.monthly, [monthlyStart, dailyEnd], (err, monthly) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get(queries.yearly, [yearlyStart, dailyEnd], (err, yearly) => {
          if (err) return res.status(500).json({ error: err.message });
          db.get(queries.summary, [], (err, summary) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ daily: daily.total, monthly: monthly.total, yearly: yearly.total, summary });
          });
        });
      });
    });
  });
});

app.post('/api/sales-record', (req, res) => {
  const { amount, note } = req.body;
  const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount must be a number' });
  }

  db.run(
    `INSERT INTO sales (amount, note, created_at) VALUES (?, ?, ?)`,
    [amount, note || '', createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, amount, note, createdAt });
    }
  );
});

app.post('/api/daily-sales', (req, res) => {
  const { amount, note, createdAt } = req.body;
  const timestamp = createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount must be a number' });
  }

  db.run(
    `INSERT INTO sales (amount, note, created_at) VALUES (?, ?, ?)`,
    [amount, note || 'Daily rollover summary', timestamp],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, amount, note, createdAt: timestamp });
    }
  );
});

// Record staff/owner activity log
app.post('/api/activity', (req, res) => {
  const { role, action, qty, amount, note, createdAt, staffId } = req.body;
  const timestamp = createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.run(
    `INSERT INTO activity_logs (role, action, qty, amount, note, is_saved, staff_id, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [role || 'staff', action || '', qty || 0, amount || 0, note || '', staffId || null, timestamp],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, role, action, qty, amount, note, staffId, createdAt: timestamp });
    }
  );
});

// Fetch pending/unsaved activity logs ONLY (most recent first)
app.get('/api/activity', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const query = `
    SELECT al.role, al.action, al.qty, al.amount, al.note, al.created_at, al.staff_id, 
           COALESCE(sa.username, 'Unknown') as staff_name
    FROM activity_logs al
    LEFT JOIN staff_accounts sa ON al.staff_id = sa.id
    WHERE IFNULL(al.is_saved, 0) = 0 
    ORDER BY al.created_at DESC LIMIT ?
  `;

  db.all(query, [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ 
      role: r.role, 
      action: r.action, 
      qty: r.qty, 
      amount: r.amount, 
      note: r.note, 
      created_at: r.created_at,
      staff_id: r.staff_id,
      staff_name: r.staff_name
    })));
  });
});

// Fetch ALL saved/archived activity logs from database for "Review All Logs"
app.get('/api/activity/all-saved', (req, res) => {
  const query = `
    SELECT al.role, al.action, al.qty, al.amount, al.note, al.created_at, al.staff_id,
           COALESCE(sa.username, 'Unknown') as staff_name
    FROM activity_logs al
    LEFT JOIN staff_accounts sa ON al.staff_id = sa.id
    ORDER BY al.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      role: r.role,
      action: r.action,
      qty: r.qty,
      amount: r.amount,
      note: r.note,
      created_at: r.created_at,
      staff_id: r.staff_id,
      staff_name: r.staff_name
    })));
  });
});

// Mark pending activity logs as saved (keeps data in DB, but hides from UI display)
app.post('/api/activity/mark-saved', (req, res) => {
  db.run(`UPDATE activity_logs SET is_saved = 1 WHERE IFNULL(is_saved, 0) = 0`, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updatedRows: this.changes });
  });
});

app.get('/api/sales-history', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();

  const dailyStart = new Date(now);
  dailyStart.setDate(now.getDate() - 29);
  const dailyStartDate = `${dailyStart.getFullYear()}-${String(dailyStart.getMonth() + 1).padStart(2, '0')}-${String(dailyStart.getDate()).padStart(2, '0')} 00:00:00`;
  const monthlyStart = new Date(now);
  monthlyStart.setMonth(now.getMonth() - 11);
  monthlyStart.setDate(1);
  const monthlyStartDate = `${monthlyStart.getFullYear()}-${String(monthlyStart.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
  const yearlyStart = `${year - 4}-01-01 00:00:00`;

  const dailyQuery = `SELECT strftime('%Y-%m-%d', created_at) AS period, IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at >= ? GROUP BY period ORDER BY period`;
  const monthlyQuery = `SELECT strftime('%Y-%m', created_at) AS period, IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at >= ? GROUP BY period ORDER BY period`;
  const yearlyQuery = `SELECT strftime('%Y', created_at) AS period, IFNULL(SUM(amount), 0) AS total FROM sales WHERE created_at >= ? GROUP BY period ORDER BY period`;

  db.all(dailyQuery, [dailyStartDate], (err, dailyRows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(monthlyQuery, [monthlyStartDate], (err, monthlyRows) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(yearlyQuery, [yearlyStart], (err, yearlyRows) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ daily: dailyRows, monthly: monthlyRows, yearly: yearlyRows });
      });
    });
  });
});

// ==================== STAFF ACCOUNT MANAGEMENT ====================
// Owner creates staff account
app.post('/api/staff/create', (req, res) => {
  const { username, password } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.run(
    `INSERT INTO staff_accounts (username, password, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    [username, password, now, now],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      // Create staff profile entry
      db.run(
        `INSERT INTO staff_profiles (staff_id, created_at, updated_at) VALUES (?, ?, ?)`,
        [this.lastID, now, now],
        (profileErr) => {
          if (profileErr) {
            return res.status(500).json({ error: 'Failed to create profile' });
          }
          res.json({ id: this.lastID, username, message: 'Staff account created successfully' });
        }
      );
    }
  );
});

// Get all staff accounts (owner only)
app.get('/api/staff/list', (req, res) => {
  const query = `SELECT id, username, created_at, updated_at FROM staff_accounts ORDER BY created_at`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Delete staff account (owner only)
app.delete('/api/staff/:id', (req, res) => {
  const staffId = req.params.id;
  
  db.run(`DELETE FROM staff_profiles WHERE staff_id = ?`, [staffId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run(`DELETE FROM staff_accounts WHERE id = ?`, [staffId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Staff account deleted' });
    });
  });
});

// Staff authenticate
app.post('/api/staff/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(
    `SELECT id, username FROM staff_accounts WHERE username = ? AND password = ?`,
    [username, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json({ id: row.id, username: row.username, message: 'Login successful' });
    }
  );
});

// Change staff password
app.post('/api/staff/:id/change-password', (req, res) => {
  const staffId = req.params.id;
  const { oldPassword, newPassword } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password required' });
  }

  db.get(
    `SELECT password FROM staff_accounts WHERE id = ?`,
    [staffId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Staff account not found' });
      if (row.password !== oldPassword) {
        return res.status(401).json({ error: 'Old password is incorrect' });
      }

      db.run(
        `UPDATE staff_accounts SET password = ?, updated_at = ? WHERE id = ?`,
        [newPassword, now, staffId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: 'Password changed successfully' });
        }
      );
    }
  );
});

// Get staff profile
app.get('/api/staff/:id/profile', (req, res) => {
  const staffId = req.params.id;

  db.get(
    `SELECT sp.id, sa.username, sp.photo_data, sp.photo_type, sp.updated_at 
     FROM staff_profiles sp
     JOIN staff_accounts sa ON sp.staff_id = sa.id
     WHERE sp.staff_id = ?`,
    [staffId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Profile not found' });
      res.json(row);
    }
  );
});

// Upload staff profile photo
app.post('/api/staff/:id/profile-photo', (req, res) => {
  const staffId = req.params.id;
  const { photoData, photoType } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (!photoData) {
    return res.status(400).json({ error: 'Photo data required' });
  }

  db.run(
    `UPDATE staff_profiles SET photo_data = ?, photo_type = ?, updated_at = ? WHERE staff_id = ?`,
    [photoData, photoType || 'image/jpeg', now, staffId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json({ success: true, message: 'Profile photo updated' });
    }
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});