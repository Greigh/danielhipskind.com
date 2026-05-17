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
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const { nanoid } = require('nanoid');

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
const port = process.env.PORT || 8080;

// Database connection
let isDbConnected = false;
let db = {}; // Will hold User, Note, AuditLog models (real or mock)

// Mock DB Implementation
class MockModel {
  constructor(data) {
    Object.assign(this, data);
    this._id = data._id || Date.now().toString();
    this.createdAt = new Date();
  }

  save() {
    // Mimic async save
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
    // Simple mock query support for basic fields
    const item = collection.find((item) => {
      return Object.keys(query).every((key) => item[key] === query[key]);
    });
    return Promise.resolve(item ? new this(item) : null);
  }

  static find(query) {
    const collection = MockModel.collections[this.modelName] || [];
    // Regex mock support for 'content' search
    if (query.content && query.content instanceof RegExp) {
      const results = collection.filter((item) =>
        query.content.test(item.content)
      );
      return Promise.resolve(results);
    }
    if (query.userId) {
      const results = collection.filter((item) => item.userId == query.userId); // loose equality for mock IDs
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
      // Very basic Mock update: merge keys
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
    // Simple mock for "delete all for user"
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

// Initialize Models Function
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
    // Assign Mock Models
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

// Connect to MongoDB
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

// Pre-initialize mock models synchronously so 'User' etc are available immediately
// (though technically they might get overwritten if connection succeeds, that's fine)
initializeModels();

// Alias for cleaner code in routes - use getters
// We can't use 'const User = db.User' because db.User changes.
// We will simply use `db.User` in the routes, OR define getters:
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

// Audit logging function
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

// Middleware
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
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://cdn.socket.io'],
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Auth middleware
const auth = (req, res, next) => {
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

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Ensure directories
const srcPath = path.join(__dirname, 'dist');
const popupsDir = path.join(srcPath, 'popups');
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(popupsDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// Serve static files
app.use(express.static(srcPath));
app.use('/adamas', express.static(srcPath));
app.use('/callcenterhelper', (req, res) => {
  res.redirect(301, '/adamas' + req.path);
});

app.use('/uploads', express.static(uploadsDir));
app.use(
  '/socket.io',
  express.static(path.join(__dirname, 'node_modules/socket.io/client-dist'))
);

// Routes for static pages with /adamas/ prefix
app.get('/adamas/privacy', (req, res) => {
  res.sendFile(path.join(srcPath, 'privacy.html'));
});

// Contact Form Handling
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ error: 'Please provide name, email, and message.' });
  }

  try {
    // Send email notification
    await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `Adamas Contact: Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <div style="margin-top: 1em; padding: 1em; background: #f5f5f5; border-radius: 5px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      `,
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact email error:', error);
    res
      .status(500)
      .json({ error: 'Failed to send message. Please try again later.' });
  }
});

app.get('/adamas/terms', (req, res) => {
  res.sendFile(path.join(srcPath, 'terms.html'));
});

app.get('/adamas/contact', (req, res) => {
  res.sendFile(path.join(srcPath, 'contact.html'));
});

app.get('/adamas/settings', (req, res) => {
  res.sendFile(path.join(srcPath, 'settings.html'));
});

// Ensure JavaScript files have proper charset in Content-Type
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  }
  next();
});

// In-memory metadata for popups
const popupStore = new Map();

// Auth routes
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

// Update Profile
app.put(
  '/api/user/profile',
  auth,
  [
    body('username').optional().isLength({ min: 3 }).trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { username, email } = req.body;
    const user = await Models.User.findById(req.user._id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if email is being changed and if it's taken
    if (email && email !== user.email) {
      const existing = await Models.User.findOne({ email });
      if (existing)
        return res
          .status(400)
          .json({ error: 'Email already currently in use' });
      user.email = email;
    }

    if (username) user.username = username;

    await user.save();

    // Return updated user data (sensitive data excluded)
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }
);

// Update Password
app.put(
  '/api/user/password',
  auth,
  [body('currentPassword').exists(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = await Models.User.findById(req.user._id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Incorrect current password' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  }
);

// Protected routes
app.get('/api/notes', auth, async (req, res) => {
  const notes = await Models.Note.find({ userId: req.user._id });
  await logAudit(req.user._id, 'read', 'notes', { count: notes.length }, req);
  res.json(notes);
});

app.post('/api/notes', auth, async (req, res) => {
  const note = new Models.Note({ ...req.body, userId: req.user._id });
  await note.save();
  await logAudit(req.user._id, 'create', 'note', { noteId: note._id }, req);
  res.status(201).json(note);
});

// Call Logs Routes
app.get('/api/calls', auth, async (req, res) => {
  try {
    const logs = await Models.CallLog.find({ userId: req.user._id });
    // Sort by most recent
    logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

app.post('/api/calls', auth, async (req, res) => {
  try {
    const logData = { ...req.body, userId: req.user._id };
    // If ID was passed (from local sync), ensure we use it or generate new if conflict?
    // Mongoose generates _id. If client sends 'id' (timestamp), store it in customData or similar if needed.
    // But for hybrid sync, we usually assume server is source of truth.
    // Client will receive the new _id and map it.

    // HOWEVER: The client likely sends 'id' property which is Date.now().
    // We can store this as 'clientRefId' or just ignore and use _id.
    // Let's rely on standard Mongoose _id.

    const callLog = new Models.CallLog(logData);
    await callLog.save();
    await logAudit(
      req.user._id,
      'create',
      'call_log',
      { logId: callLog._id },
      req
    );
    res.status(201).json(callLog);
  } catch {
    res.status(500).json({ error: 'Failed to save call log' });
  }
});

app.put('/api/calls/:id', auth, async (req, res) => {
  try {
    const updated = await Models.CallLog.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Call log not found' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update call log' });
  }
});

app.delete('/api/calls/:id', auth, async (req, res) => {
  try {
    await Models.CallLog.findByIdAndDelete(req.params.id);
    await logAudit(
      req.user._id,
      'delete',
      'call_log',
      { logId: req.params.id },
      req
    );
    res.json({ message: 'Call log deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete call log' });
  }
});

// User Settings Routes
app.get('/api/user/settings', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.settings || {});
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/user/settings', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Merge existing settings with updates
    // Use simple object spread for now. For deep merge, we'd need lodash.
    // But settings are usually shallow enough or we replace sections.
    // Let's assume req.body contains the *changes* or full object?
    // Safer to merge.
    user.settings = { ...(user.settings || {}), ...req.body };

    // Mark mixed type as modified
    user.markModified('settings');
    await user.save();
    res.json(user.settings);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// File upload
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Search
app.get('/api/search', auth, async (req, res) => {
  const { q } = req.query;
  const notes = await Models.Note.find({
    userId: req.user._id,
    content: new RegExp(q, 'i'),
  });
  res.json(notes);
});

// Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Email
app.post('/api/email/send', auth, (req, res) => {
  const { to, subject, text } = req.body;
  transporter.sendMail(
    { from: process.env.EMAIL_USER, to, subject, text },
    async (err) => {
      if (err) {
        res.status(500).json({ error: 'Email failed' });
      } else {
        await logAudit(req.user._id, 'send', 'email', { to }, req);
        res.json({ message: 'Email sent' });
      }
    }
  );
});

// CRM proxy (example for Salesforce)
app.get('/api/crm/salesforce', auth, async (req, res) => {
  // This is a placeholder; in real app, use OAuth and API keys
  res.json({ message: 'CRM integration placeholder' });
});

// Finesse debug endpoint - returns detailed connection info
app.get('/adamas/api/finesse/debug', async (req, res) => {
  const { url, username, password } = req.query;

  console.log('🐛 Finesse debug request:', {
    url,
    username,
    hasPassword: !!password,
  });

  if (!url || !username || !password) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['url', 'username', 'password'],
    });
  }

  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      /\.cisco\.com$/,
      /finesse/i,
      /lmgrccx/i,
      /lminfosys\.net$/,
    ];
    const isAllowed = allowedHosts.some((pattern) =>
      pattern.test(urlObj.hostname)
    );
    if (!isAllowed) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}`;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    console.log('🐛 Debug: Testing connection to:', finesseUrl);

    const startTime = Date.now();
    const response = await fetch(finesseUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
        'User-Agent': 'CallCenterHelper/1.0',
      },
    });
    const endTime = Date.now();

    const responseBody = await response.text();

    const debugInfo = {
      request: {
        url: finesseUrl,
        method: 'GET',
        headers: {
          Authorization: '[REDACTED]',
          Accept: 'application/xml',
          'X-Cisco-Finesse-OS': 'CallCenterHelper',
          'User-Agent': 'CallCenterHelper/1.0',
        },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        bodyLength: responseBody.length,
        body:
          responseBody.length > 1000
            ? responseBody.substring(0, 1000) + '...'
            : responseBody,
        timing: `${endTime - startTime}ms`,
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('🐛 Debug result:', {
      status: response.status,
      timing: debugInfo.response.timing,
      bodyLength: responseBody.length,
    });

    res.json(debugInfo);
  } catch (error) {
    console.error('🐛 Debug error:', error);
    res.status(500).json({
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        stack: error.stack,
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Finesse debug endpoint for User
app.get('/adamas/api/finesse/debug/User/:username', async (req, res) => {
  const { url, username, password } = req.query;

  console.log('🐛 Finesse debug request:', {
    url,
    username,
    hasPassword: !!password,
  });

  if (!url || !username || !password) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['url', 'username', 'password'],
    });
  }

  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      /\.cisco\.com$/,
      /finesse/i,
      /lmgrccx/i,
      /lminfosys\.net$/,
    ];
    const isAllowed = allowedHosts.some((pattern) =>
      pattern.test(urlObj.hostname)
    );
    if (!isAllowed) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}`;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    console.log('🐛 Debug: Testing connection to:', finesseUrl);

    const startTime = Date.now();
    const response = await fetch(finesseUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
        'User-Agent': 'CallCenterHelper/1.0',
      },
    });
    const endTime = Date.now();

    const responseBody = await response.text();

    const debugInfo = {
      request: {
        url: finesseUrl,
        method: 'GET',
        headers: {
          Authorization: '[REDACTED]',
          Accept: 'application/xml',
          'X-Cisco-Finesse-OS': 'CallCenterHelper',
          'User-Agent': 'CallCenterHelper/1.0',
        },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        bodyLength: responseBody.length,
        body:
          responseBody.length > 1000
            ? responseBody.substring(0, 1000) + '...'
            : responseBody,
        timing: `${endTime - startTime}ms`,
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('🐛 Debug result:', {
      status: response.status,
      timing: debugInfo.response.timing,
      bodyLength: responseBody.length,
    });

    res.json(debugInfo);
  } catch (error) {
    console.error('🐛 Debug error:', error);
    res.status(500).json({
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        stack: error.stack,
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Finesse API proxy (GET)
app.get('/adamas/api/finesse/User/:username', async (req, res) => {
  const { username } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      /\.cisco\.com$/,
      /finesse/i,
      /lmgrccx/i,
      /lminfosys\.net$/,
    ];
    if (!allowedHosts.some((pattern) => pattern.test(urlObj.hostname))) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}`;
    const response = await fetch(finesseUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
        'User-Agent': 'CallCenterHelper/1.0',
      },
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    res.status(500).json({ error: `Finesse Proxy Error: ${error.message}` });
  }
});

// Finesse API Proxy (POST - Make Call)
// Route: /finesse/api/User/{id}/Dialogs
app.post('/adamas/api/finesse/User/:username/Dialogs', async (req, res) => {
  const { username } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;
  // Body is expected to be XML string or JSON depending on client,
  // but Finesse expects XML usually. We'll pass the raw body if possible or reconstruct.
  // Assuming body-parser handles json/urlencoded.
  // If client sends XML string in body with proper content-type, we might need text parser.
  // But likely 'req.body' is JSON from client utility.
  // Let's assume client sends JSON payload `{ destination: '1234' }` or similar wrapper?
  // Or simpler: Client sends the exact XML string to forward?
  // Let's look at how client might implement it. Ideally, proxy just forwards.
  // We'll trust req.body is what we want to send, but Finesse needs XML.

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      /\.cisco\.com$/,
      /finesse/i,
      /lmgrccx/i,
      /lminfosys\.net$/,
    ];
    if (!allowedHosts.some((pattern) => pattern.test(urlObj.hostname))) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/User/${encodeURIComponent(username)}/Dialogs`;

    // Construct XML payload from JSON body if needed, or pass through
    // For Make Call, Finesse expects:
    // <Dialog><requestedAction>MAKE_CALL</requestedAction><toAddress>...</toAddress><fromAddress>...</fromAddress></Dialog>
    // Let's assume client constructs this XML or sends simple JSON we convert.
    // For flexibility, let's support a 'rawXml' field or 'destination' field.

    let requestBody = req.body;

    // If client sent detailed JSON we might need to map it?
    // BUT safest is to let client send the XML string for Finesse.
    // However, body-parser might have parsed it.
    // If client sends { destination: '...' }, we create XML.
    if (req.body.destination) {
      requestBody = `<Dialog>
        <requestedAction>MAKE_CALL</requestedAction>
        <toAddress>${req.body.destination}</toAddress>
        <fromAddress>${username}</fromAddress>
      </Dialog>`;
    } else if (typeof req.body === 'string') {
      // Already string (perhaps text/plain middleware?)
      // Already string (perhaps text/plain middleware?)
      requestBody = req.body;
    } else if (req.body.rawXml) {
      requestBody = req.body.rawXml;
    }

    const response = await fetch(finesseUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
      },
      body: requestBody,
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Finesse MakeCall Error:', error);
    res.status(500).json({ error: `Make Call Failed: ${error.message}` });
  }
});

// Finesse API Proxy (PUT - Answer, Hold, Retrieve, Drop)
// Route: /finesse/api/Dialog/{id}
app.put('/adamas/api/finesse/Dialog/:dialogId', async (req, res) => {
  const { dialogId } = req.params;
  const { url } = req.query;
  const authHeader = req.headers.authorization;

  if (!url || !authHeader) {
    return res
      .status(400)
      .json({ error: 'Missing URL or Authorization header' });
  }

  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      /\.cisco\.com$/,
      /finesse/i,
      /lmgrccx/i,
      /lminfosys\.net$/,
    ];
    if (!allowedHosts.some((pattern) => pattern.test(urlObj.hostname))) {
      return res.status(400).json({ error: 'Invalid Finesse server URL' });
    }

    const finesseUrl = `${url}/finesse/api/Dialog/${encodeURIComponent(dialogId)}`;

    // Expecting JSON: { action: 'ANSWER' | 'DROP' | 'HOLD' | 'RETRIEVE' }
    // Finesse expects XML: <Dialog><requestedAction>...</requestedAction></Dialog>
    let requestBody = req.body;

    if (req.body.action) {
      requestBody = `<Dialog>
          <requestedAction>${req.body.action}</requestedAction>
       </Dialog>`;
    } else if (typeof req.body === 'string') {
      requestBody = req.body;
    } else if (req.body.rawXml) {
      requestBody = req.body.rawXml;
    }

    const response = await fetch(finesseUrl, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'X-Cisco-Finesse-OS': 'CallCenterHelper',
      },
      body: requestBody,
    });

    res.status(response.status);
    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/xml'
    );
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Finesse Action Error:', error);
    res.status(500).json({ error: `Call Action Failed: ${error.message}` });
  }
});

// AI Insights
app.post('/api/ai-insights', auth, async (req, res) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { prompt } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ response: completion.choices[0].message.content });
  } catch {
    res.status(500).json({ error: 'AI failed' });
  }
});

// Webhooks for workflows
app.post('/api/webhook/:workflow', (req, res) => {
  // Trigger workflow based on req.params.workflow
  io.emit('workflow-trigger', req.body);
  res.json({ message: 'Webhook received' });
});

// Multichannel: SMS via Twilio
// Twilio initialized inside routes to allow dynamic config or just kept if needed globally
// const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
// Removing global twilio require as it's unused and we use user-specific creds in /api/sms

app.post('/api/sms', auth, async (req, res) => {
  const { to, message } = req.body;

  try {
    // Get user's Twilio credentials
    const user = await Models.User.findById(req.user._id);
    if (
      !user ||
      !user.twilio.accountSid ||
      !user.twilio.authToken ||
      !user.twilio.phoneNumber
    ) {
      return res.status(400).json({
        error:
          'Twilio not configured. Please set up your Twilio credentials in Settings.',
      });
    }

    // Create Twilio client with user's credentials
    const twilioClient = require('twilio')(
      user.twilio.accountSid,
      user.twilio.authToken
    );

    await twilioClient.messages.create({
      body: message,
      from: user.twilio.phoneNumber,
      to,
    });

    res.json({ message: 'SMS sent successfully' });
  } catch (err) {
    console.error('SMS send error:', err);
    res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
  }
});

// Update user Twilio settings
app.put('/api/user/twilio', auth, async (req, res) => {
  const { accountSid, authToken, phoneNumber } = req.body;

  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate Twilio credentials by attempting to create a client
    const twilioClient = require('twilio')(accountSid, authToken);
    await twilioClient.api.accounts(accountSid).fetch();

    // Update user Twilio settings
    user.twilio = { accountSid, authToken, phoneNumber };
    await user.save();

    res.json({ message: 'Twilio settings updated successfully' });
  } catch (err) {
    console.error('Twilio validation error:', err);
    res.status(400).json({
      error:
        'Invalid Twilio credentials. Please check your Account SID and Auth Token.',
    });
  }
});

// Get user Twilio settings (without sensitive data)
app.get('/api/user/twilio', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return settings without auth token for security
    res.json({
      accountSid: user.twilio.accountSid,
      phoneNumber: user.twilio.phoneNumber,
      isConfigured: !!(
        user.twilio.accountSid &&
        user.twilio.authToken &&
        user.twilio.phoneNumber
      ),
    });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve Twilio settings' });
  }
});

// Socket.io for real-time
io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('join', (userId) => {
    socket.join(userId);
  });
  socket.on('note-update', (data) => {
    socket.to(data.userId).emit('note-updated', data);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// GDPR: Data export
app.get('/api/export', auth, async (req, res) => {
  const user = await Models.User.findById(req.user._id);
  const notes = await Models.Note.find({ userId: req.user._id });
  res.json({ user, notes });
});

// GDPR: Delete account
app.delete('/api/user', auth, async (req, res) => {
  await Models.User.findByIdAndDelete(req.user._id);
  await Models.Note.deleteMany({ userId: req.user._id });
  res.json({ message: 'Account deleted' });
});

// Parse JSON bodies for popup creation
app.use(bodyParser.json({ limit: '2mb' }));

// Endpoint to create a popup page. Expects { html: '<html>...</html>' }
app.post('/popup', (req, res) => {
  const { html } = req.body || {};
  if (!html) return res.status(400).json({ error: 'Missing html' });

  const id = nanoid();
  const filename = `${id}.html`;
  const filePath = path.join(popupsDir, filename);

  try {
    fs.writeFileSync(filePath, html, 'utf8');
    const createdAt = Date.now();
    popupStore.set(id, { filePath, createdAt });
    res.json({ id, url: `/popups/${filename}` });
  } catch (err) {
    console.error('Error writing popup file', err);
    res.status(500).json({ error: 'Failed to write popup' });
  }
});

// Optional helper endpoint to delete a popup page
app.delete('/popup/:id', (req, res) => {
  const id = req.params.id;
  const meta = popupStore.get(id);
  if (!meta) return res.status(404).json({ error: 'Not found' });
  try {
    fs.unlinkSync(meta.filePath);
    popupStore.delete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting popup file', err);
    res.status(500).json({ error: 'Failed to delete popup' });
  }
});

// Redirect convenience route (optional)
app.get('/popup/:id', (req, res) => {
  const id = req.params.id;
  const meta = popupStore.get(id);
  if (!meta) return res.status(404).send('Not found');
  const filename = path.basename(meta.filePath);
  res.redirect(`/popups/${filename}`);
});

// Periodic cleanup: remove popup files older than 24 hours
const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, meta] of popupStore.entries()) {
    if (now - meta.createdAt > MAX_AGE) {
      try {
        fs.unlinkSync(meta.filePath);
      } catch {
        // ignore
      }
      popupStore.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

// GDPR Compliance: Data Export
app.get('/api/user/data', auth, async (req, res) => {
  try {
    const user = await Models.User.findById(req.user._id).select('-password');
    const notes = await Models.Note.find({ userId: req.user._id });
    const auditLogs = await Models.AuditLog.find({ userId: req.user._id });
    const data = { user, notes, auditLogs };
    await logAudit(req.user._id, 'export', 'user_data', {}, req);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GDPR Compliance: Data Deletion
app.delete('/api/user/delete', auth, async (req, res) => {
  try {
    await Models.Note.deleteMany({ userId: req.user._id });
    await Models.AuditLog.deleteMany({ userId: req.user._id });
    await Models.User.findByIdAndDelete(req.user._id);
    await logAudit(req.user._id, 'delete', 'user_account', {}, req);
    res.json({ message: 'Account deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
