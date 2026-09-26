const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'task-manager-secret';
const app = express();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'tasks.db'));
db.pragma('journal_mode = WAL');

const initializeDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
};

initializeDb();

const clients = new Set();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(String(password), salt);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)'
  ).run(String(name).trim(), normalizedEmail, passwordHash, salt);

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user);

  return res.status(201).json({
    message: 'Registration successful.',
    token,
    user,
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordHash = hashPassword(String(password), user.salt);
  if (passwordHash !== user.password_hash) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email };
  const token = signToken(safeUser);

  return res.json({ message: 'Login successful.', token, user: safeUser });
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

app.get('/api/tasks', requireAuth, (req, res) => {
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC')
    .all(req.user.id);

  return res.json(tasks);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, priority, status, dueDate } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  const now = new Date().toISOString();
  const task = {
    user_id: req.user.id,
    title: String(title).trim(),
    description: String(description || '').trim(),
    priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
    status: ['pending', 'in-progress', 'completed'].includes(status) ? status : 'pending',
    due_date: dueDate || null,
    created_at: now,
    updated_at: now,
  };

  const result = db.prepare(
    `INSERT INTO tasks (user_id, title, description, priority, status, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    task.user_id,
    task.title,
    task.description,
    task.priority,
    task.status,
    task.due_date,
    task.created_at,
    task.updated_at
  );

  const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  broadcast({ type: 'task-created', task: createdTask });

  return res.status(201).json(createdTask);
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing || existing.user_id !== req.user.id) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const { title, description, priority, status, dueDate } = req.body || {};
  const updates = {
    title: title ? String(title).trim() : existing.title,
    description: description !== undefined ? String(description).trim() : existing.description,
    priority: ['low', 'medium', 'high'].includes(priority) ? priority : existing.priority,
    status: ['pending', 'in-progress', 'completed'].includes(status) ? status : existing.status,
    due_date: dueDate !== undefined ? dueDate || null : existing.due_date,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.title,
    updates.description,
    updates.priority,
    updates.status,
    updates.due_date,
    updates.updated_at,
    id
  );

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  broadcast({ type: 'task-updated', task: updatedTask });

  return res.json(updatedTask);
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task || task.user_id !== req.user.id) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  broadcast({ type: 'task-deleted', id: Number(id) });

  return res.json({ message: 'Task deleted successfully.' });
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task Manager app running at http://localhost:${PORT}`);
  });
}

module.exports = { app, db };
