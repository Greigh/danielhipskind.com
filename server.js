const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, 'logs');
try {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
} catch (e) {
  /* ignore */
}
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');
const next = require('next');

// Setup Next.js
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3001;

// Database connection
let isDbConnected = false;
let db = {};

// Mock DB Implementation
class MockModel {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || Date.now().toString();
    this.createdAt = new Date();
  }

  save() {
    const collection = MockModel.collections[this.constructor.modelName];
    if (!this._id) this._id = Date.now().toString();
    const existingIndex = collection.findIndex((i) => i._id === this._id);
    if (existingIndex >= 0) {
      collection[existingIndex] = this;
    } else {
      collection.push(this);
    }
    return Promise.resolve(this);
  }

  static findOne(query) {
    const collection = MockModel.collections[this.modelName] || [];
    const item = collection.find((item) => {
      return Object.keys(query).every((key) => item[key] === query[key]);
    });
    return Promise.resolve(item ? new this(item) : null);
  }

  static find(query) {
    const collection = MockModel.collections[this.modelName] || [];
    if (query.content && query.content instanceof RegExp) {
      const results = collection.filter((item) =>
        query.content.test(item.content)
      );
      return Promise.resolve(results);
    }
    if (query.userId) {
      const results = collection.filter((item) => item.userId == query.userId);
      return Promise.resolve(results);
    }
    return Promise.resolve(collection);
  }

  static findById(id) {
    const collection = MockModel.collections[this.modelName] || [];
    const item = collection.find((i) => i._id == id);
    return Promise.resolve(item ? new this(item) : null);
  }

  static findByIdAndUpdate(id, update) {
    const collection = MockModel.collections[this.modelName] || [];
    const index = collection.findIndex((i) => i._id == id);
    if (index > -1) {
      if (update.$set) Object.assign(collection[index], update.$set);
      else Object.assign(collection[index], update);
      return Promise.resolve(new this(collection[index]));
    }
    return Promise.resolve(null);
  }

  static findByIdAndDelete(id) {
    const collection = MockModel.collections[this.modelName] || [];
    const index = collection.findIndex((i) => i._id == id);
    if (index > -1) {
      collection.splice(index, 1);
    }
    return Promise.resolve();
  }

  static deleteMany(query) {
    if (query.userId) {
      const collection = MockModel.collections[this.modelName] || [];
      const newCollection = collection.filter(
        (item) => item.userId != query.userId
      );
      MockModel.collections[this.modelName] = newCollection;
    }
    return Promise.resolve();
  }
}
MockModel.collections = { User: [], Note: [], AuditLog: [], CallLog: [] };

function initializeModels() {
  if (isDbConnected) {
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'agent' },
      createdAt: { type: Date, default: Date.now },
      settings: { type: mongoose.Schema.Types.Mixed, default: {} },
      twilio: {
        accountSid: { type: String, default: '' },
        authToken: { type: String, default: '' },
        phoneNumber: { type: String, default: '' },
      },
    });
    db.User = mongoose.model('User', UserSchema);

    const NoteSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now },
    });
    db.Note = mongoose.model('Note', NoteSchema);

    const CallLogSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      callerName: String,
      callerPhone: String,
      callType: String,
      startTime: Date,
      endTime: Date,
      duration: Number,
      notes: String,
      status: String,
      customData: { type: mongoose.Schema.Types.Mixed },
      accountNumber: String,
      ssn: String,
      createdAt: { type: Date, default: Date.now },
    });
    db.CallLog = mongoose.model('CallLog', CallLogSchema);

    const AuditLogSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, required: true },
      resource: { type: String, required: true },
      details: { type: mongoose.Schema.Types.Mixed },
      ip: String,
      userAgent: String,
      timestamp: { type: Date, default: Date.now },
    });
    db.AuditLog = mongoose.model('AuditLog', AuditLogSchema);
    logger.info('Using MongoDB Models');
  } else {
    db.User = class User extends MockModel {
      static modelName = 'User';
    };
    db.Note = class Note extends MockModel {
      static modelName = 'Note';
    };
    db.CallLog = class CallLog extends MockModel {
      static modelName = 'CallLog';
    };
    db.AuditLog = class AuditLog extends MockModel {
      static modelName = 'AuditLog';
    };
    logger.warn(
      'WARNING: Using In-Memory Mock Database. Data will be lost on restart.'
    );
  }
}

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/callcenter', {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    logger.info('MongoDB connected');
    isDbConnected = true;
    initializeModels();
  })
  .catch((err) => {
    logger.error(
      'MongoDB connection error - Falling back to Mock DB',
      err.message
    );
    isDbConnected = false;
    initializeModels();
  });

initializeModels();

const Models = {
  get User() {
    return db.User;
  },
  get Note() {
    return db.Note;
  },
  get CallLog() {
    return db.CallLog;
  },
  get AuditLog() {
    return db.AuditLog;
  },
};

async function logAudit(userId, action, resource, details, req) {
  try {
    const auditEntry = new Models.AuditLog({
      userId,
      action,
      resource,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    await auditEntry.save();
  } catch (err) {
    logger.error('Audit log error:', err);
  }
}

// prepare Next.js
nextApp.prepare().then(() => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.jsdelivr.net',
            'https://cdn.socket.io',
            'https://static.cloudflareinsights.com',
            'https://cdnjs.cloudflare.com',
            'https://cdnjs.cloudflare.com', // Chart.js
          ],
// ... (CSP continues)

  // Analytics Ingest
  app.post('/api/analytics', (req, res) => {
    try {
      const payload = req.body || {};
      const record = {
        timestamp: new Date().toISOString(),
        ip: getRealIP(req),
        ua: req.get('user-agent') || null,
        path: req.get('referer') || payload.path || null,
        referrer: payload.referrer || null, // Capture referrer
        event: payload.event || 'unknown',
        data: payload.data || null,
        country: req.get('cf-ipcountry') || null,
        city: req.get('cf-ipcity') || null,
      };
// ...

  // CSV Export Header
    res.write('timestamp,ip,ua,path,referrer,event,data,country,city\n');

// ...

  // CSV Export Row
              `"${(e.path || '').replace(/"/g, '""')}"`,
              `"${(e.referrer || '').replace(/"/g, '""')}"`, // Add referrer column
              `"${e.event || ''}"`,

// ...

  // Explicitly serve admin index for /admin path
  app.get(['/admin', '/admin/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  });

  // Explicitly serve admin analytics for /admin/analytics
  app.get(['/admin/analytics', '/admin/analytics/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'analytics.html'));
  });
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'https://cdn.socket.io',
            'https://cloudflareinsights.com',
          ],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    })
  );
  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use(limiter);

  const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    // Allow Next.js assets to bypass auth
    if (req.path.startsWith('/_next') || req.path.startsWith('/assets'))
      return next();

    // Check if it is an API call
    if (req.path.startsWith('/api/') || req.path.startsWith('/adamas/')) {
      next();
      return;
    }
    next();
  };

  // Re-define auth properly for route usage
  const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = verified;
      next();
    } catch {
      res.status(400).json({ error: 'Invalid token' });
    }
  };

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
      cb(null, Date.now() + path.extname(file.originalname)),
  });
  const upload = multer({ storage });

  // Correct path for Adamas files on server (root/adamas)
  const adamasPath = path.join(__dirname, 'adamas');
  const popupsDir = path.join(adamasPath, 'popups');
  const uploadsDir = path.join(__dirname, 'uploads');

  // Create directories if they don't exist
  fs.mkdirSync(popupsDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  // Serve Adamas static files
  app.use('/adamas', express.static(adamasPath));

  // Redirect /callcenterhelper to /adamas
  app.use('/callcenterhelper', (req, res) => {
    res.redirect(301, '/adamas' + req.path);
  });

  app.use('/uploads', express.static(uploadsDir));
  app.use(
    '/socket.io',
    express.static(path.join(__dirname, 'node_modules/socket.io/client-dist'))
  );

  // Admas Static Routes
  app.get('/adamas/privacy', (req, res) => {
    res.sendFile(path.join(adamasPath, 'privacy.html'));
  });
  app.get('/adamas/terms', (req, res) => {
    res.sendFile(path.join(adamasPath, 'terms.html'));
  });
  app.get('/adamas/contact', (req, res) => {
    res.sendFile(path.join(adamasPath, 'contact.html'));
  });
  app.get('/adamas/settings', (req, res) => {
    res.sendFile(path.join(adamasPath, 'settings.html'));
  });

  // Ensure JS charset
  app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    }
    next();
  });

  const popupStore = new Map();

  // --- API ROUTES (Adamas) ---
  // Using authMiddleware where appropriate

  app.post(
    '/api/register',
    [
      body('username').isLength({ min: 3 }).trim().escape(),
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 6 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { username, email, password, role = 'agent' } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new Models.User({
        username,
        email,
        password: hashedPassword,
        role,
      });
      try {
        await user.save();
        res.status(201).json({ message: 'User registered' });
      } catch {
        res.status(400).json({ error: 'User already exists' });
      }
    }
  );

  app.post(
    '/api/login',
    [body('email').isEmail().normalizeEmail(), body('password').exists()],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const user = await Models.User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET || 'secret'
      );
      res.json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    }
  );

  // --- Admin Logic & Analytics (In-Memory Session Fallback) ---
  const ADMIN_SESSION_NAME = 'admin_session';
  const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const adminSessions = new Map(); // In-memory session store (replaces Redis)

  function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  function verifySessionToken(token) {
    if (!token) return false;
    const session = adminSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.exp) {
      adminSessions.delete(token);
      return false;
    }
    return true;
  }

  function parseCookies(req) {
    const header = req.headers.cookie || '';
    return header
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .reduce((acc, kv) => {
        const [k, ...v] = kv.split('=');
        acc[k] = decodeURIComponent((v || []).join('='));
        return acc;
      }, {});
  }

  function getRealIP(req) {
    const cf = req.get('CF-Connecting-IP');
    if (cf && cf !== '127.0.0.1') return cf;
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  // Login
  app.post('/api/admin/login', async (req, res) => {
    const secret = (req.body && req.body.secret) || req.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET)
      return res.status(403).json({ error: 'Admin login not enabled' });
    if (!secret || secret !== process.env.ADMIN_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });

    const token = generateSessionToken();
    adminSessions.set(token, {
      ts: Date.now(),
      exp: Date.now() + ADMIN_SESSION_TTL_MS,
    });

    const cookieParts = [
      `${ADMIN_SESSION_NAME}=${token}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`,
      'SameSite=Strict',
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    return res.status(204).end();
  });

  // Logout
  app.post('/api/admin/logout', (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    if (token) adminSessions.delete(token);
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_SESSION_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    );
    return res.status(204).end();
  });

  // Analytics Ingest
  app.post('/api/analytics', (req, res) => {
    try {
      const payload = req.body || {};
      const record = {
        timestamp: new Date().toISOString(),
        ip: getRealIP(req),
        ua: req.get('user-agent') || null,
        path: req.get('referer') || payload.path || null,
        referrer: payload.referrer || null,
        event: payload.event || 'unknown',
        data: payload.data || null,
        country: req.get('cf-ipcountry') || null,
        city: req.get('cf-ipcity') || null,
      };
      const dateKey = new Date().toISOString().slice(0, 10);
      const filename = path.join(LOGS_DIR, `analytics-${dateKey}.log`);
      fs.appendFile(filename, JSON.stringify(record) + '\n', (err) => {
        if (err) console.error('Analytics write error', err);
      });
      res.status(204).end();
    } catch (err) {
      console.error('Analytics ingest error', err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Admin Analytics Read
  app.get('/api/admin/analytics', async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    const headerSecret = req.get('x-admin-secret');
    const authHeader = req.get('authorization') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');

    const isAuth =
      (token && verifySessionToken(token)) ||
      headerSecret === process.env.ADMIN_SECRET ||
      bearer === process.env.ADMIN_SECRET;

    if (!process.env.ADMIN_SECRET)
      return res.status(403).json({ error: 'Admin disabled' });
    if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    try {
      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.startsWith('analytics-'))
        .sort()
        .reverse();
      if (files.length === 0)
        return res.json({ source: 'file', count: 0, events: [] });

      const latest = path.join(LOGS_DIR, files[0]);
      const raw = fs
        .readFileSync(latest, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean);
      // Read last N lines
      const selected = raw
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
      return res.json({
        source: 'file',
        file: files[0],
        count: selected.length,
        events: selected,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Read failed' });
    }
  });

  // CSV Export
  app.get('/api/admin/analytics.csv', async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_SESSION_NAME];
    const headerSecret = req.get('x-admin-secret');
    const authHeader = req.get('authorization') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');

    const isAuth =
      (token && verifySessionToken(token)) ||
      headerSecret === process.env.ADMIN_SECRET ||
      bearer === process.env.ADMIN_SECRET;

    if (!process.env.ADMIN_SECRET)
      return res.status(403).send('Admin disabled');
    if (!isAuth) return res.status(401).send('Unauthorized');

    const limit = Math.min(Number(req.query.limit) || 1000, 10000);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="analytics.csv"'
    );
    res.write('timestamp,ip,ua,path,referrer,event,data,country,city\n');

    try {
      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.startsWith('analytics-'))
        .sort()
        .reverse();
      if (files.length === 0) {
        res.end();
        return;
      }

      const latest = path.join(LOGS_DIR, files[0]);
      const stream = fs.createReadStream(latest, { encoding: 'utf8' });
      let leftover = '';
      let count = 0;

      stream.on('data', (chunk) => {
        leftover += chunk;
        const parts = leftover.split('\n');
        leftover = parts.pop();
        // Traverse backwards to get newest first? The legacy code did that in memory but for CSV stream it just dumped.
        // Actually legacy code did: `for (let i = parts.length - 1; i >= 0; i--)`. Let's match that.
        for (let i = parts.length - 1; i >= 0; i--) {
          const line = parts[i].trim();
          if (!line) continue;
          try {
            const e = JSON.parse(line);
            const row = [
              `"${e.timestamp || ''}"`,
              `"${e.ip || ''}"`,
              `"${(e.ua || '').replace(/"/g, '""')}"`,
              `"${(e.path || '').replace(/"/g, '""')}"`,
              `"${(e.referrer || '').replace(/"/g, '""')}"`,
              `"${e.event || ''}"`,
              `"${JSON.stringify(e.data || '').replace(/"/g, '""')}"`,
              `"${e.country || ''}"`,
              `"${e.city || ''}"`,
            ];
            res.write(row.join(',') + '\n');
            count++;
            if (count >= limit) {
              stream.destroy();
              res.end();
              return;
            }
          } catch {}
        }
      });
      stream.on('end', () => res.end());
    } catch {
      res.status(500).end();
    }
  });

  // End Admin Logic
  // The user can add specific missing API endpoints if needed later.
  // BUT the user's specific request "new files aren't deploying" was about the MAIN SITE (Next.js).

  // CRM/Finesse/Etc routes would go here.

  // Contact Form
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  app.post('/api/contact', async (req, res) => {
    // reuse logic from original or just pass for now
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: 'Missing fields' });
    try {
      await transporter.sendMail({
        from: `"${name}" <${process.env.EMAIL_USER}>`,
        replyTo: email,
        to: process.env.EMAIL_USER,
        subject: `Adamas Contact: ${name}`,
        text: message,
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Explicitly serve admin index for /admin path to avoid Next.js 404
  app.get(['/admin', '/admin/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
  });

  // Explicitly serve admin analytics for /admin/analytics
  app.get(['/admin/analytics', '/admin/analytics/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'analytics.html'));
  });

  // Default Catch-All: Next.js
  app.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
