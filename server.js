const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const multer = require('multer');
const puppeteer = require('puppeteer');
const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const csv = require('csv-parser');

// ─── Admin emails (comma-separated in .env) ───────────────────────────────────
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
const DEVELOPER_EMAILS = (process.env.DEVELOPER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);

function isAdmin(email) {
    return email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ─── SQLite Persistent Log Store ────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'logs.db');
const db = new Database(DB_PATH);

db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp  TEXT NOT NULL,
        action     TEXT NOT NULL,
        status     TEXT NOT NULL,
        details    TEXT,
        user_email TEXT
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
        email         TEXT PRIMARY KEY,
        display_name  TEXT,
        phone         TEXT,
        quote_counter INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quotes (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_number  TEXT NOT NULL,
        user_email    TEXT NOT NULL,
        entity        TEXT NOT NULL DEFAULT 'Exotel',
        quote_data    TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'active',
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_versions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id      INTEGER NOT NULL,
        quote_data    TEXT NOT NULL,
        edited_by     TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        FOREIGN KEY(quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS drafts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        draft_key     TEXT NOT NULL,
        user_email    TEXT NOT NULL,
        draft_data    TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        UNIQUE(draft_key, user_email)
    );

    CREATE TABLE IF NOT EXISTS skus (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sku_key     TEXT NOT NULL UNIQUE,
        sku_name    TEXT NOT NULL,
        entity      TEXT NOT NULL,
        sku_config  TEXT NOT NULL,
        created_by  TEXT NOT NULL,
        created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sku_requests (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email  TEXT NOT NULL,
        sku_name    TEXT NOT NULL,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'pending',
        created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email    TEXT NOT NULL,
        quote_number  TEXT,
        sku_name      TEXT,
        field_name    TEXT,
        field_value   TEXT,
        cleared       INTEGER NOT NULL DEFAULT 0,
        cleared_by    TEXT,
        created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dev_feedback (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email  TEXT NOT NULL,
        message     TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'new',
        created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email   TEXT NOT NULL,
        title        TEXT NOT NULL,
        notes        TEXT,
        status       TEXT NOT NULL DEFAULT 'pending',
        due_at       TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        subtasks     TEXT,
        reminder_at  TEXT,
        ringer_type  TEXT NOT NULL DEFAULT 'both',
        alert_rung   INTEGER DEFAULT 0,
        ai_data      TEXT
    );
`);

try {
    db.exec("ALTER TABLE todos ADD COLUMN ai_data TEXT");
} catch (e) {
    // Column already exists, ignore
}

// ─── Security Helpers ────────────────────────────────────────────────────────
function isDeveloper(email) {
    if (!email) return false;
    return DEVELOPER_EMAILS.includes(email.toLowerCase());
}

function ensureDeveloper(req, res, next) {
    const email = req.user?.emails?.[0]?.value;
    if (isDeveloper(email)) return next();
    res.status(403).json({ error: 'Access denied. Reserved for lead developer only.' });
}

const insertLog = db.prepare(
    `INSERT INTO logs (timestamp, action, status, details, user_email)
     VALUES (?, ?, ?, ?, ?)`
);

function addLog(action, status, details, userEmail) {
    const timestamp = new Date().toISOString();
    try {
        insertLog.run(timestamp, action, status, details || '', userEmail || 'system');
    } catch (e) {
        console.error('[DB] Failed to insert log:', e.message);
    }
    console.log(`[LOG] ${action} - ${status}`);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true })); // Exotel webhooks send form-encoded
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'exotel-secret-key-123',
    resave: false,
    saveUninitialized: false,
    rolling: true,           // refresh cookie on each request
    cookie: {
        secure: false,       // set to true if using HTTPS
        maxAge: 100 * 365 * 24 * 60 * 60 * 1000 // 100 years (stay on forever)
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── Passport Google OAuth ───────────────────────────────────────────────────
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env!");
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'missing_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret',
    callbackURL: "/auth/google/callback",
    proxy: true
},
    function (accessToken, refreshToken, profile, cb) {
        const exotelEmail = profile.emails.find(email => email.value.toLowerCase().endsWith('@exotel.com'));
        if (exotelEmail) {
            // Auto-upsert display name from Google profile
            const displayName = profile.displayName || '';
            try {
                db.prepare(`INSERT OR IGNORE INTO user_profiles (email, display_name, phone, quote_counter) VALUES (?, ?, '', 0)`)
                    .run(exotelEmail.value, displayName);
                // Update display_name if it was empty
                db.prepare(`UPDATE user_profiles SET display_name = ? WHERE email = ? AND (display_name IS NULL OR display_name = '')`)
                    .run(displayName, exotelEmail.value);
            } catch (e) { /* ignore */ }
            addLog('LOGIN_ATTEMPT', 'SUCCESS', `User ${exotelEmail.value} successfully logged in.`, exotelEmail.value);
            return cb(null, profile);
        } else {
            addLog('LOGIN_ATTEMPT', 'FAILED', `Unauthorized attempt from ${profile.emails[0].value}`, profile.emails[0].value);
            return cb(null, false, { message: "Access restricted to authorized email addresses only." });
        }
    }));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function ensureAdmin(req, res, next) {
    const email = req.user?.emails?.[0]?.value;
    if (isAdmin(email)) return next();
    res.status(403).json({ error: 'Forbidden. Admins only.' });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/login', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=unauthorized' }),
    function (req, res) {
        res.redirect('/');
    }
);


// ─── Generic Proxy ───────────────────────────────────────────────────────────
app.post('/api/proxy', ensureAuthenticated, async (req, res) => {
    const { url, method, data, headers } = req.body;
    const userEmail = req.user?.emails?.[0]?.value || 'unknown';
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const actionName = `PROXY_${(method || 'GET').toUpperCase()}_${new URL(url).pathname}`;
    try {
        const response = await axios({ method: method || 'GET', url, data, headers });
        addLog(actionName, 'SUCCESS', `Target: ${url}`, userEmail);
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const errorData = error.response ? error.response.data : error.message;
        addLog(actionName, 'ERROR', `Target: ${url} - Error: ${JSON.stringify(errorData)}`, userEmail);
        res.status(status).json({ error: errorData });
    }
});

// ─── User Logs (own logs only, optionally since a given ISO timestamp) ─────────
app.get('/api/logs', ensureAuthenticated, (req, res) => {
    const userEmail = req.user?.emails?.[0]?.value || 'unknown';
    const since = req.query.since || null; // ISO string — session start time
    try {
        let rows;
        if (since) {
            rows = db.prepare(
                `SELECT id, timestamp, action, status, details FROM logs
                 WHERE user_email = ? AND timestamp >= ? ORDER BY id DESC LIMIT 500`
            ).all(userEmail, since);
        } else {
            rows = db.prepare(
                `SELECT id, timestamp, action, status, details FROM logs
                 WHERE user_email = ? ORDER BY id DESC LIMIT 500`
            ).all(userEmail);
        }
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// ─── Admin: All Logs (with optional user / date filters) ─────────────────────
app.get('/api/admin/logs', ensureAuthenticated, ensureAdmin, (req, res) => {
    const { user, from, to } = req.query;
    try {
        let query = `SELECT id, timestamp, action, status, details, user_email FROM logs WHERE 1=1`;
        const params = [];
        if (user)  { query += ` AND user_email = ?`;      params.push(user); }
        if (from)  { query += ` AND timestamp >= ?`;      params.push(from); }
        if (to)    { query += ` AND timestamp <= ?`;      params.push(to + 'T23:59:59.999Z'); }
        query += ` ORDER BY id DESC LIMIT 2000`;
        const rows = db.prepare(query).all(...params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// ─── Admin Check ─────────────────────────────────────────────────────────────
app.get('/api/admin/check', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value || '';
    res.json({ isAdmin: isAdmin(email) });
});

// ─── Online User Presence Tracking (in-memory, no DB) ────────────────────────
const onlineUsers = new Map(); // email → { name, avatar, last_seen }

// Passive tracker: update presence on every authenticated API call
app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        const email = req.user.emails?.[0]?.value;
        if (email) {
            const profile = req.user;
            const name = profile.displayName || email.split('@')[0];
            const avatar = profile.photos?.[0]?.value || null;
            onlineUsers.set(email, { name, avatar, last_seen: Date.now() });
        }
    }
    next();
});

// Explicit heartbeat — client pings every 30s
app.post('/api/heartbeat', ensureAuthenticated, (req, res) => {
    res.json({ ok: true, ts: Date.now() });
});

// Admin: get all users with online/offline status
app.get('/api/admin/online-users', ensureAuthenticated, ensureAdmin, (req, res) => {
    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
    const now = Date.now();
    try {
        // ── Build lifetime user set from everyone who ever logged in ──────────
        // Pull distinct emails from successful login logs
        const loggedInEmails = db.prepare(
            `SELECT DISTINCT user_email AS email FROM logs WHERE status = 'SUCCESS' ORDER BY email ASC`
        ).all().map(r => r.email).filter(Boolean);

        // Also grab user_profiles for display names
        const profiles = db.prepare(`SELECT email, display_name FROM user_profiles`).all();
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.email] = p; });

        // Merge: start from all known emails
        const allEmails = new Set([...loggedInEmails, ...Object.keys(profileMap)]);

        const result = [];
        for (const email of allEmails) {
            const profile = profileMap[email];
            const presence = onlineUsers.get(email);
            const last_seen = presence?.last_seen || null;
            const is_online = last_seen && (now - last_seen) < ONLINE_THRESHOLD_MS;
            result.push({
                email,
                name: presence?.name || profile?.display_name || email.split('@')[0],
                avatar: presence?.avatar || null,
                is_online: !!is_online,
                last_seen: last_seen ? new Date(last_seen).toISOString() : null,
                is_admin: isAdmin(email),
            });
        }

        // Also include anyone in onlineUsers map not yet in the known set
        for (const [email, data] of onlineUsers.entries()) {
            if (!allEmails.has(email)) {
                const is_online = (now - data.last_seen) < ONLINE_THRESHOLD_MS;
                result.push({
                    email,
                    name: data.name || email.split('@')[0],
                    avatar: data.avatar || null,
                    is_online: !!is_online,
                    last_seen: new Date(data.last_seen).toISOString(),
                    is_admin: isAdmin(email),
                });
            }
        }

        // Sort: online first, then alphabetical by name
        result.sort((a, b) => {
            if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        res.json(result);
    } catch (e) {
        console.error('[online-users] Error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch online users' });
    }
});

// ─── User Info ───────────────────────────────────────────────────────────────
app.get('/api/user', ensureAuthenticated, (req, res) => {
    res.json(req.user);
});

// ─── User Profile (name, phone, quote_counter) ───────────────────────────────
app.get('/api/user-profile', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    try {
        const row = db.prepare(`SELECT * FROM user_profiles WHERE email = ?`).get(email);
        res.json(row || { email, display_name: '', phone: '', quote_counter: 0 });
    } catch (e) {
        res.status(500).json({ error: 'Failed to read profile' });
    }
});

app.post('/api/user-profile', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { display_name, phone } = req.body;
    try {
        db.prepare(`INSERT INTO user_profiles (email, display_name, phone, quote_counter) VALUES (?, ?, ?, 0)
                    ON CONFLICT(email) DO UPDATE SET display_name = COALESCE(NULLIF(?, ''), display_name), phone = COALESCE(NULLIF(?, ''), phone)`)
            .run(email, display_name || '', phone || '', display_name || '', phone || '');
        const row = db.prepare(`SELECT * FROM user_profiles WHERE email = ?`).get(email);
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ─── Quote Number Generation ──────────────────────────────────────────────────
app.post('/api/quotes/next-number', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    try {
        // Increment counter
        db.prepare(`INSERT INTO user_profiles (email, display_name, phone, quote_counter) VALUES (?, '', '', 1)
                    ON CONFLICT(email) DO UPDATE SET quote_counter = quote_counter + 1`).run(email);
        const profile = db.prepare(`SELECT quote_counter, display_name FROM user_profiles WHERE email = ?`).get(email);
        const counter = profile?.quote_counter || 1;
        // Initials from email (before @): e.g. hussain.umaini → HU
        const localPart = email.split('@')[0];
        const parts = localPart.split('.');
        let initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
        if (initials.length > 4) initials = initials.substring(0, 4);
        // Date: YYMMDD
        const now = new Date();
        const yy = String(now.getFullYear()).slice(2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;
        const seq = String(counter).padStart(2, '0');
        res.json({ quote_number: `${initials}-${dateStr}-${seq}`, counter });
    } catch (e) {
        res.status(500).json({ error: 'Failed to generate quote number' });
    }
});

// ─── Quotes CRUD ─────────────────────────────────────────────────────────────
app.get('/api/quotes', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    try {
        const rows = db.prepare(`SELECT * FROM quotes WHERE user_email = ? ORDER BY id DESC`).all(email);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read quotes' });
    }
});

app.get('/api/quotes/admin', ensureAuthenticated, ensureAdmin, (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM quotes ORDER BY id DESC`).all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read quotes' });
    }
});

app.post('/api/export-pdf', ensureAuthenticated, async (req, res) => {
    const { htmlPayload } = req.body;
    if (!htmlPayload) return res.status(400).send('Missing htmlPayload');
    
    let browser;
    try {
        const launchOpts = {
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            defaultViewport: { width: 1400, height: 900 }
        };
        // On Railway (Linux), use the system-installed Chromium pointed to by env var
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        browser = await puppeteer.launch(launchOpts);
        const page = await browser.newPage();
        
        // Render the exact HTML passed from the frontend containing statically linked stylesheets
        await page.setContent(htmlPayload, { waitUntil: 'networkidle0' });
        
        // Emulate screen media type so it looks EXACTLY like the live preview (keeps backgrounds, colors, and paddings intact)
        await page.emulateMediaType('screen');

        // Generate a crisp Vector PDF completely ignoring client browser variations
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' }
        });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (e) {
        console.error("Puppeteer PDF Error:", e);
        res.status(500).send('PDF Generation failed.');
    } finally {
        if (browser) await browser.close();
    }
});

app.post('/api/quotes', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { quote_number, entity, quote_data } = req.body;
    if (!quote_number || !quote_data) return res.status(400).json({ error: 'quote_number and quote_data required' });
    const now = new Date().toISOString();
    try {
        const result = db.prepare(
            `INSERT INTO quotes (quote_number, user_email, entity, quote_data, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', ?, ?)`
        ).run(quote_number, email, entity || 'Exotel', JSON.stringify(quote_data), now, now);
        addLog('QUOTE_CREATED', 'SUCCESS', `Quote ${quote_number} created`, email);
        res.json({ id: result.lastInsertRowid, quote_number });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save quote' });
    }
});

app.put('/api/quotes/:id', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    const { quote_data, entity } = req.body;
    const now = new Date().toISOString();
    try {
        const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });
        if (existing.user_email !== email && !isAdmin(email)) return res.status(403).json({ error: 'Forbidden' });
        
        // Backup older version to history
        db.prepare(`INSERT INTO quote_versions (quote_id, quote_data, edited_by, created_at) VALUES (?, ?, ?, ?)`)
            .run(id, existing.quote_data, email, now);
            
        db.prepare(`UPDATE quotes SET quote_data = ?, entity = ?, updated_at = ? WHERE id = ?`)
            .run(JSON.stringify(quote_data), entity || existing.entity, now, id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

app.get('/api/quotes/:id/versions', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });
        if (existing.user_email !== email && !isAdmin(email)) return res.status(403).json({ error: 'Forbidden' });
        
        const versions = db.prepare(`SELECT * FROM quote_versions WHERE quote_id = ? ORDER BY id DESC`).all(id);
        
        // Unshift the current row to act as the "latest" version
        versions.unshift({
            id: 'current',
            quote_data: existing.quote_data,
            edited_by: existing.user_email,
            created_at: existing.updated_at
        });
        
        res.json(versions);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read quote versions' });
    }
});

app.delete('/api/quotes/:id', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
        if (!existing) return res.status(404).json({ error: 'Quote not found' });
        if (existing.user_email !== email && !isAdmin(email)) return res.status(403).json({ error: 'Forbidden' });
        db.prepare(`UPDATE quotes SET status = 'deleted' WHERE id = ?`).run(id);
        addLog('QUOTE_DELETED', 'SUCCESS', `Quote ${existing.quote_number} soft-deleted`, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete quote' });
    }
});

// ─── Drafts CRUD ─────────────────────────────────────────────────────────────
app.get('/api/drafts', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    try {
        // Auto-purge expired drafts
        db.prepare(`DELETE FROM drafts WHERE user_email = ? AND updated_at < ?`).run(email, cutoff);
        const rows = db.prepare(`SELECT id, draft_key, draft_data, created_at, updated_at FROM drafts WHERE user_email = ? ORDER BY id DESC`).all(email);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read drafts' });
    }
});

app.post('/api/drafts', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { draft_key, draft_data } = req.body;
    if (!draft_key || !draft_data) return res.status(400).json({ error: 'draft_key and draft_data required' });
    const now = new Date().toISOString();
    try {
        db.prepare(
            `INSERT INTO drafts (draft_key, user_email, draft_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(draft_key, user_email) DO UPDATE SET draft_data = ?, updated_at = ?`
        ).run(draft_key, email, JSON.stringify(draft_data), now, now, JSON.stringify(draft_data), now);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

app.delete('/api/drafts/:id', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        db.prepare(`DELETE FROM drafts WHERE id = ? AND user_email = ?`).run(id, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

app.delete('/api/drafts/key/:key', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { key } = req.params;
    try {
        db.prepare(`DELETE FROM drafts WHERE draft_key = ? AND user_email = ?`).run(key, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete draft by key' });
    }
});

// ─── Approval Requests ────────────────────────────────────────────────────────
app.post('/api/approval-requests', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { quote_number, sku_name, field_name, field_value } = req.body;
    const now = new Date().toISOString();
    try {
        const result = db.prepare(
            `INSERT INTO approval_requests (user_email, quote_number, sku_name, field_name, field_value, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(email, quote_number || '', sku_name || '', field_name || '', field_value || '', now);
        addLog('STOP_LOCK_OVERRIDE', 'WARNING', `${email} overrode stop-lock on ${sku_name}.${field_name} = ${field_value}`, email);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(500).json({ error: 'Failed to log approval request' });
    }
});

app.get('/api/admin/approval-requests', ensureAuthenticated, ensureAdmin, (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM approval_requests ORDER BY id DESC`).all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read approval requests' });
    }
});

app.post('/api/admin/approval-requests/:id/clear', ensureAuthenticated, ensureAdmin, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        db.prepare(`UPDATE approval_requests SET cleared = 1, cleared_by = ? WHERE id = ?`).run(email, id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to clear approval request' });
    }
});

// ─── SKUs ────────────────────────────────────────────────────────────────────
app.get('/api/skus', ensureAuthenticated, (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM skus ORDER BY id ASC`).all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read SKUs' });
    }
});

app.post('/api/admin/skus', ensureAuthenticated, ensureAdmin, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { sku_key, sku_name, entity, sku_config } = req.body;
    if (!sku_key || !sku_name) return res.status(400).json({ error: 'sku_key and sku_name required' });
    const now = new Date().toISOString();
    try {
        const result = db.prepare(
            `INSERT INTO skus (sku_key, sku_name, entity, sku_config, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(sku_key, sku_name, entity || 'Exotel', JSON.stringify(sku_config || {}), email, now);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU key already exists' });
        res.status(500).json({ error: 'Failed to add SKU' });
    }
});

app.post('/api/sku-requests', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { sku_name, description } = req.body;
    if (!sku_name) return res.status(400).json({ error: 'sku_name required' });
    const now = new Date().toISOString();
    try {
        db.prepare(`INSERT INTO sku_requests (user_email, sku_name, description, status, created_at) VALUES (?, ?, ?, 'pending', ?)`)
            .run(email, sku_name, description || '', now);
        addLog('SKU_REQUEST', 'SUCCESS', `${email} requested new SKU: ${sku_name}`, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to submit SKU request' });
    }
});

app.get('/api/admin/sku-requests', ensureAuthenticated, ensureAdmin, (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM sku_requests ORDER BY id DESC`).all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read SKU requests' });
    }
});

app.post('/api/admin/sku-requests/:id/resolve', ensureAuthenticated, ensureAdmin, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        db.prepare(`UPDATE sku_requests SET status = 'resolved' WHERE id = ?`).run(id);
        const request = db.prepare(`SELECT sku_name FROM sku_requests WHERE id = ?`).get(id);
        addLog('SKU_REQUEST_RESOLVED', 'SUCCESS', `SKU request "${request?.sku_name}" marked as resolved by ${email}`, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to resolve SKU request' });
    }
});

// ─── Reset Quote Counter ─────────────────────────────────────────────────────
// POST /api/quotes/reset-counter   — resets YOUR counter to 0
// POST /api/quotes/reset-counter?target=email   — admin only: reset another user
app.post('/api/quotes/reset-counter', ensureAuthenticated, (req, res) => {
    const callerEmail = req.user?.emails?.[0]?.value;
    const targetEmail = req.query.target || callerEmail;
    // Only admins can reset someone else
    if (targetEmail !== callerEmail && !isAdmin(callerEmail)) {
        return res.status(403).json({ error: 'Forbidden. Only admins can reset other users.' });
    }
    try {
        db.prepare(`UPDATE user_profiles SET quote_counter = 0 WHERE email = ?`).run(targetEmail);
        addLog('QUOTE_COUNTER_RESET', 'SUCCESS', `Counter reset for ${targetEmail}`, callerEmail);
        res.json({ success: true, target: targetEmail, message: `Quote counter reset for ${targetEmail}` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to reset quote counter' });
    }
});

// ─── Admin: Reset ALL counters ────────────────────────────────────────────────
app.post('/api/admin/reset-all-counters', ensureAuthenticated, ensureAdmin, (req, res) => {
    const callerEmail = req.user?.emails?.[0]?.value;
    try {
        db.prepare(`UPDATE user_profiles SET quote_counter = 0`).run();
        addLog('QUOTE_COUNTER_RESET_ALL', 'SUCCESS', `All quote counters reset`, callerEmail);
        res.json({ success: true, message: 'All quote counters have been reset to 0' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to reset counters' });
    }
});

// ─── Admin: Full Database Reset ──────────────────────────────────────────────
// Wipes ALL data from every table. Schema is preserved; no server restart needed.
app.post('/api/admin/reset-db', ensureAuthenticated, ensureAdmin, (req, res) => {
    const callerEmail = req.user?.emails?.[0]?.value;
    try {
        db.transaction(() => {
            db.prepare(`DELETE FROM quote_versions`).run();
            db.prepare(`DELETE FROM quotes`).run();
            db.prepare(`DELETE FROM drafts`).run();
            db.prepare(`DELETE FROM sku_requests`).run();
            db.prepare(`DELETE FROM skus`).run();
            db.prepare(`DELETE FROM approval_requests`).run();
            db.prepare(`DELETE FROM dev_feedback`).run();
            db.prepare(`DELETE FROM todos`).run();
            db.prepare(`DELETE FROM logs`).run();
            db.prepare(`DELETE FROM user_profiles`).run();
        })();
        // Write one bootstrap audit log AFTER the wipe so we know who did it
        addLog('DB_RESET', 'WARNING', `Full database reset performed by ${callerEmail}`, callerEmail);
        console.warn(`[SECURITY] Full DB reset by ${callerEmail} at ${new Date().toISOString()}`);
        res.json({ success: true, message: 'Database has been fully reset. All data has been erased.' });
    } catch (e) {
        console.error('[DB RESET ERROR]', e);
        res.status(500).json({ error: 'Failed to reset database: ' + e.message });
    }
});

// ─── Admin: Trigger a Railway redeploy of this service ───────────────────────
// Uses Railway's public GraphQL API. RAILWAY_SERVICE_ID and RAILWAY_ENVIRONMENT_ID
// are injected automatically by Railway at runtime; the admin only needs to add a
// RAILWAY_API_TOKEN (Account or Team token) in the service variables.
app.post('/api/admin/redeploy', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const callerEmail = req.user?.emails?.[0]?.value;
    const token = process.env.RAILWAY_API_TOKEN;
    const serviceId = process.env.RAILWAY_SERVICE_ID;
    const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

    if (!token) {
        return res.status(400).json({ error: 'Redeploy is not configured. Add a RAILWAY_API_TOKEN variable to this service on Railway.' });
    }
    if (!serviceId || !environmentId) {
        return res.status(400).json({ error: 'Missing RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID. These are normally injected by Railway automatically.' });
    }

    const query = `mutation Redeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`;

    try {
        const r = await axios.post(
            'https://backboard.railway.com/graphql/v2',
            { query, variables: { serviceId, environmentId } },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        if (r.data?.errors?.length) {
            const msg = r.data.errors.map(e => e.message).join('; ');
            console.error('[REDEPLOY] Railway API error:', msg);
            return res.status(502).json({ error: 'Railway API error: ' + msg });
        }
        addLog('SERVER_REDEPLOY', 'WARNING', `Railway redeploy triggered by ${callerEmail}`, callerEmail);
        console.warn(`[REDEPLOY] Triggered by ${callerEmail} at ${new Date().toISOString()}`);
        res.json({ success: true, message: 'Redeploy triggered. The server will restart shortly.' });
    } catch (e) {
        const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
        console.error('[REDEPLOY ERROR]', detail);
        res.status(502).json({ error: 'Failed to reach Railway API: ' + (e.response?.status || e.message) });
    }
});

// ─── Developer Feedback ──────────────────────────────────────────────────────
// Gemini key rotation helper (reuses the same pool as the AI quote parser)
function getGeminiKeysForFeedback() {
    const keys = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    return [...new Set(keys)];
}

async function analyseFeedbackWithGemini(rawMessage, submitterEmail) {
    // Frontend appends screenshot as: \n\n[SCREENSHOT_ATTACHED]\n<dataURL>
    const MARKER = '\n\n[SCREENSHOT_ATTACHED]\n';
    const markerIdx = rawMessage.indexOf(MARKER);
    const feedbackText = markerIdx !== -1 ? rawMessage.substring(0, markerIdx) : rawMessage;
    const screenshotDataUrl = markerIdx !== -1 ? rawMessage.substring(markerIdx + MARKER.length) : null;

    const keys = getGeminiKeysForFeedback();
    let lastErr;
    for (const key of keys) {
        for (const modelName of ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest']) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                const prompt = `You are a product feedback analyst for Exotel's Internal Sales Dashboard.
An SE (sales engineer) submitted the following feedback:

"${feedbackText}"

Submitted by: ${submitterEmail}
${screenshotDataUrl ? '\nA screenshot has been attached — analyse it along with the text.' : ''}

Provide a concise analysis in this exact format:

*📋 Summary*
[2-3 sentence summary of what the SE is reporting${screenshotDataUrl ? ', referencing what is visible in the screenshot' : ''}]

*🔧 Recommended Actions*
[Bullet list of specific actions the product/dev team should take]

*⚡ Priority*
[Low / Medium / High — with one-line reason]`;

                // Build multimodal parts array
                const parts = [{ text: prompt }];
                if (screenshotDataUrl) {
                    const matches = screenshotDataUrl.match(/^data:([^;]+);base64,(.+)$/s);
                    if (matches) {
                        parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                    }
                }

                const result = await model.generateContent(parts);
                return result.response.text();
            } catch (err) {
                lastErr = err;
            }
        }
    }
    throw lastErr || new Error('All keys failed');
}

async function uploadScreenshotToPublicHost(dataUrl) {
    try {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
        if (!matches) return null;
        const mimeType = matches[1];
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        // Build multipart body manually (no extra deps needed)
        const boundary = '----FeedbackBoundary' + Date.now().toString(36);
        const CRLF = '\r\n';
        const header = Buffer.from(
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="file"; filename="screenshot.${ext}"${CRLF}` +
            `Content-Type: ${mimeType}${CRLF}` +
            CRLF
        );
        const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
        const body = Buffer.concat([header, imageBuffer, footer]);
        const resp = await axios.post('https://0x0.st', body, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            timeout: 10000
        });
        return resp.data.trim(); // e.g. https://0x0.st/Hx7K.png
    } catch (e) {
        console.warn('[FEEDBACK] Screenshot upload failed:', e.message);
        return null;
    }
}

async function postToGoogleChat(message, imageUrl) {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!webhookUrl) { console.warn('[FEEDBACK] GOOGLE_CHAT_WEBHOOK_URL not set — skipping Google Chat notification'); return; }
    if (imageUrl) {
        // Use cards_v2 format to embed the image
        const payload = {
            cardsV2: [{
                cardId: 'feedback-card',
                card: {
                    sections: [{
                        widgets: [
                            { textParagraph: { text: message } },
                            { image: { imageUrl, altText: 'Attached Screenshot' } }
                        ]
                    }]
                }
            }]
        };
        await axios.post(webhookUrl, payload);
    } else {
        await axios.post(webhookUrl, { text: message });
    }
}

async function sendFeedbackEmail(subject, body) {
    const user = process.env.FEEDBACK_GMAIL_USER;
    const pass = process.env.FEEDBACK_GMAIL_APP_PASSWORD;
    if (!user || !pass) { console.warn('[FEEDBACK] FEEDBACK_GMAIL_USER or FEEDBACK_GMAIL_APP_PASSWORD not set — skipping email'); return; }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
    await transporter.sendMail({
        from: `"Exotel Dashboard" <${user}>`,
        to: 'hussain.umaini@exotel.com',
        subject,
        text: body
    });
}

app.post('/api/feedback', ensureAuthenticated, async (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const now = new Date().toISOString();
    try {
        db.prepare(`INSERT INTO dev_feedback (user_email, message, created_at) VALUES (?, ?, ?)`).run(email, message, now);
        res.json({ success: true }); // respond immediately — analysis runs in background
    } catch (e) {
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    // ── Background: Gemini analysis + Google Chat + Email ─────────────────────
    setImmediate(async () => {
        console.log('[FEEDBACK] Background analysis started for:', email);
        try {
            // Strip screenshot from display — keep only the human-written text
            const MARKER = '\n\n[SCREENSHOT_ATTACHED]\n';
            const markerIdx = message.indexOf(MARKER);
            const cleanText = markerIdx !== -1 ? message.substring(0, markerIdx) : message;
            const hasScreenshot = markerIdx !== -1;

            console.log('[FEEDBACK] Calling Gemini...');
            const analysis = await analyseFeedbackWithGemini(message, email);
            console.log('[FEEDBACK] Gemini analysis OK:', analysis.slice(0, 80));

            const screenshotNote = hasScreenshot ? '\n_(Screenshot attached — analysed by Gemini)_' : '';
            let chatMsg = `*📬 New Dashboard Feedback from ${email}*\n\n*Original Feedback:*\n_${cleanText}_${screenshotNote}\n\n${analysis}`;
            // Google Chat hard limit: 4096 chars
            if (chatMsg.length > 4000) chatMsg = chatMsg.substring(0, 3950) + '\n\n_[Analysis truncated — see email for full report]_';
            console.log('[FEEDBACK] Posting to Google Chat...');
            // Upload screenshot for display in chat if present
            let screenshotPublicUrl = null;
            if (hasScreenshot) {
                const MARKER2 = '\n\n[SCREENSHOT_ATTACHED]\n';
                const idx2 = message.indexOf(MARKER2);
                const dataUrl = idx2 !== -1 ? message.substring(idx2 + MARKER2.length) : null;
                if (dataUrl) {
                    console.log('[FEEDBACK] Uploading screenshot to public host...');
                    screenshotPublicUrl = await uploadScreenshotToPublicHost(dataUrl);
                    console.log('[FEEDBACK] Screenshot URL:', screenshotPublicUrl || 'upload failed');
                }
            }
            await postToGoogleChat(chatMsg, screenshotPublicUrl)
                .then(() => console.log('[FEEDBACK] Google Chat ✓'))
                .catch(e => console.error('[FEEDBACK] Google Chat error:', e.response?.data || e.message));

            const emailScreenshotNote = hasScreenshot ? '\n[Screenshot was attached and analysed by Gemini]\n' : '';
            const emailBody = `New feedback submitted by: ${email}\nTime: ${now}\n\nFeedback:\n${cleanText}${emailScreenshotNote}\n\n--- AI Analysis ---\n${analysis}`;
            console.log('[FEEDBACK] Sending email...');
            await sendFeedbackEmail(`[Dashboard Feedback] from ${email}`, emailBody)
                .then(() => console.log('[FEEDBACK] Email ✓'))
                .catch(e => console.error('[FEEDBACK] Email error:', e.message));
        } catch (err) {
            console.error('[FEEDBACK] Fatal error in background job:', err.message);
        }
    });
});

// Test endpoint — visit in browser to verify Google Chat webhook works
app.get('/api/admin/test-feedback-notif', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!webhookUrl) return res.json({ ok: false, error: 'GOOGLE_CHAT_WEBHOOK_URL not set in .env' });
    try {
        await axios.post(webhookUrl, { text: '*🧪 Test notification from Exotel Dashboard* — Google Chat webhook is working!' });
        res.json({ ok: true, message: 'Message sent to Google Chat successfully' });
    } catch (e) {
        const detail = e.response?.data || e.message;
        console.error('[TEST] Google Chat webhook error:', detail);
        res.json({ ok: false, error: detail });
    }
});

app.get('/api/developer/check', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    res.json({ isDeveloper: isDeveloper(email) });
});

app.get('/api/admin/dev-feedback', ensureAuthenticated, ensureDeveloper, (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM dev_feedback ORDER BY id DESC`).all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read feedback' });
    }
});

app.post('/api/admin/dev-feedback/:id/delete', ensureAuthenticated, ensureDeveloper, (req, res) => {
    const { id } = req.params;
    try {
        db.prepare(`DELETE FROM dev_feedback WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

app.post('/api/admin/dev-feedback/clear-all', ensureAuthenticated, ensureDeveloper, (req, res) => {
    const email = req.user?.emails?.[0]?.value || 'unknown';
    console.log(`[FEEDBACK] Clear all requested by ${email}`);
    try {
        const info = db.prepare(`DELETE FROM dev_feedback`).run();
        console.log(`[FEEDBACK] Clear all successful. Rows affected: ${info.changes}`);
        res.json({ success: true, changes: info.changes });
    } catch (e) {
        console.error('[FEEDBACK] Error clearing dev_feedback:', e.message);
        res.status(500).json({ error: 'Failed to clear all feedback: ' + e.message });
    }
});

// ─── Smart Task Board (Todos) CRUD & AI Parser ────────────────────────────────
app.get('/api/todos', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    try {
        const rows = db.prepare(`SELECT * FROM todos WHERE user_email = ? ORDER BY id DESC`).all(email);
        const mapped = rows.map(r => ({
            ...r,
            subtasks: r.subtasks ? JSON.parse(r.subtasks) : [],
            ai_data: r.ai_data ? JSON.parse(r.ai_data) : null
        }));
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read todos' });
    }
});

app.post('/api/todos', ensureAuthenticated, async (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { title, notes, due_at, subtasks, reminder_at, ringer_type, ai_data, smart } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let finalTitle = title;
    let finalNotes = notes || '';
    let finalDueAt = due_at || null;
    let finalSubtasks = subtasks || [];
    let finalReminderAt = reminder_at || null;
    let finalRingerType = ringer_type || 'both';
    let finalAiData = ai_data || null;

    const now = new Date().toISOString();
    try {
        const result = db.prepare(
            `INSERT INTO todos (user_email, title, notes, status, due_at, created_at, updated_at, subtasks, reminder_at, ringer_type, alert_rung, ai_data)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 0, ?)`
        ).run(
            email,
            finalTitle,
            finalNotes,
            finalDueAt,
            now,
            now,
            JSON.stringify(finalSubtasks),
            finalReminderAt,
            finalRingerType,
            finalAiData ? JSON.stringify(finalAiData) : null
        );
        addLog('TODO_CREATED', 'SUCCESS', `Todo "${finalTitle}" created (smart: ${!!smart})`, email);
        res.json({ id: result.lastInsertRowid, title: finalTitle });
    } catch (e) {
        console.error('[TODO_CREATE_ERROR]', e);
        res.status(500).json({ error: 'Failed to save todo: ' + e.message });
    }
});

app.post('/api/todos/voice', ensureAuthenticated, upload.single('audio'), async (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    if (!req.file) return res.status(400).json({ error: 'Audio file is required' });

    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('GEMINI_API_KEY not configured');
        
        let parsed = null;
        for (const modelName of ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest']) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });

                const prompt = `You are a smart task parser.
Listen to the audio, which contains a user dictating a task.
Transcribe the audio exactly (STT) and parse it into a JSON object with these exact keys:
1. "title": Short, clear summary of the task.
2. "notes": The full exact transcript of what was said.
3. "due_at": An ISO 8601 string representing the exact date and time the task is due, or null if no date/time is specified.

Return ONLY the JSON string. Do not include markdown code block formatting.`;

                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: req.file.mimetype,
                            data: req.file.buffer.toString("base64")
                        }
                    }
                ]);

                let text = result.response.text().trim();
                if (text.startsWith('\`\`\`')) {
                    text = text.replace(/^\`\`\`json\s*/, '').replace(/\`\`\`$/, '').trim();
                }

                parsed = JSON.parse(text);
                break;
            } catch (err) {
                console.error(`[TODO VOICE PARSE ERROR] Model ${modelName} failed:`, err.message);
            }
        }

        if (!parsed) {
            throw new Error('Failed to parse voice with all Gemini models.');
        }
        
        const finalTitle = parsed.title || "Voice Task";
        const finalNotes = parsed.notes || "";
        const finalDueAt = parsed.due_at || null;
        const now = new Date().toISOString();

        const insertRes = db.prepare(
            `INSERT INTO todos (user_email, title, notes, status, due_at, created_at, updated_at, subtasks, reminder_at, ringer_type, alert_rung, ai_data)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, '[]', null, 'both', 0, null)`
        ).run(email, finalTitle, finalNotes, finalDueAt, now, now);

        res.json({ id: insertRes.lastInsertRowid, title: finalTitle, notes: finalNotes });
    } catch (e) {
        console.error('[TODO_VOICE_ERROR]', e);
        res.status(500).json({ error: 'Failed to process voice: ' + e.message });
    }
});

app.put('/api/todos/:id', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    const { title, notes, status, due_at, subtasks, reminder_at, ringer_type, alert_rung, ai_data } = req.body;
    const now = new Date().toISOString();
    try {
        const existing = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(id);
        if (!existing) return res.status(404).json({ error: 'Todo not found' });
        if (existing.user_email !== email) return res.status(403).json({ error: 'Forbidden' });

        db.prepare(
            `UPDATE todos SET title = ?, notes = ?, status = ?, due_at = ?, subtasks = ?, reminder_at = ?, ringer_type = ?, alert_rung = ?, ai_data = ?, updated_at = ? WHERE id = ?`
        ).run(
            title !== undefined ? title : existing.title,
            notes !== undefined ? notes : existing.notes,
            status !== undefined ? status : existing.status,
            due_at !== undefined ? due_at : existing.due_at,
            subtasks !== undefined ? JSON.stringify(subtasks) : existing.subtasks,
            reminder_at !== undefined ? reminder_at : existing.reminder_at,
            ringer_type !== undefined ? ringer_type : existing.ringer_type,
            alert_rung !== undefined ? alert_rung : existing.alert_rung,
            ai_data !== undefined ? JSON.stringify(ai_data) : existing.ai_data,
            now,
            id
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

app.delete('/api/todos/:id', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        const existing = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(id);
        if (!existing) return res.status(404).json({ error: 'Todo not found' });
        if (existing.user_email !== email) return res.status(403).json({ error: 'Forbidden' });
        db.prepare(`DELETE FROM todos WHERE id = ?`).run(id);
        addLog('TODO_DELETED', 'SUCCESS', `Todo "${existing.title}" deleted`, email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

app.post('/api/todos/:id/ai-think', ensureAuthenticated, async (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { id } = req.params;
    try {
        const todo = db.prepare(`SELECT * FROM todos WHERE id = ? AND user_email = ?`).get(id, email);
        if (!todo) return res.status(404).json({ error: 'Todo not found' });

        const allKeys = [];
        if (process.env.GEMINI_API_KEY) allKeys.push(process.env.GEMINI_API_KEY);
        const uniqueKeys = [...new Set(allKeys)];

        if (uniqueKeys.length === 0) {
            return res.status(503).json({ error: 'API key is not configured' });
        }

        let lastErr;
        for (const key of uniqueKeys) {
            for (const modelName of ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-flash-latest']) {
                try {
                    console.log(`[AI-THINK] Thinking with model ${modelName}...`);
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({ 
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json" }
                    });

                    const prompt = `You are an operations dashboard task synthesizer.
The user added a task: "${todo.title}"
Due Date/Time: ${todo.due_at ? todo.due_at : 'No due date'}
Notes: ${todo.notes || 'None'}
Current Time: ${new Date().toISOString()}

Analyze this task and think about how the user can perform it better, when they should be reminded, and what subtasks they need.
Provide a structured JSON output matching this structure:
{
  "smart_reminders": [
    {
      "time": "ISO 8601 string representing a reminder time in the future",
      "reason": "Short explanation of why this reminder time is chosen",
      "rung": 0
    }
  ],
  "suggested_subtasks": ["string representing concrete follow-up steps"],
  "better_advice": "A short paragraph (2-3 sentences) explaining how the user can perform this task better, focusing on efficiency, CPaaS best practices, or general productivity.",
  "summary_title": "A clean, concise title (4-8 words) summarizing the user's raw input task",
  "priority": "one of: 'high', 'medium', 'low'",
  "estimated_duration": "an estimate of how long this task will take, e.g., '15 mins', '45 mins', '2 hours'",
  "category": "one of: 'Technical', 'Client', 'Operations', 'Follow-up', 'Internal', 'General'"
}

IMPORTANT: Only generate items in "suggested_subtasks" if the task is complex, multi-step, or requires planning. For simple tasks that do not require multiple steps, return an empty array [] for "suggested_subtasks". Keep priority as 'medium' unless keywords like 'urgent', 'now', 'asap', 'blocker', 'critical', 'client review' strongly suggest 'high'.`;

                    let result;
                    let retries = 3;
                    while (retries > 0) {
                        try {
                            result = await model.generateContent(prompt);
                            break;
                        } catch (err) {
                            if ((err.message.includes('503') || err.message.includes('Service Unavailable') || err.message.includes('Resource Exhausted') || err.message.includes('429')) && retries > 1) {
                                console.warn(`[AI-THINK] Model ${modelName} returned temporary error. Retrying in 2 seconds...`);
                                await new Promise(r => setTimeout(r, 2000));
                                retries--;
                            } else {
                                throw err;
                            }
                        }
                    }
                    let text = result.response.text().trim();

                    if (text.startsWith('```')) {
                        text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                    }

                    const parsed = JSON.parse(text);
                    
                    const currentSubtasks = todo.subtasks ? JSON.parse(todo.subtasks) : [];
                    const mergedSubtasks = [...currentSubtasks];
                    if (parsed.suggested_subtasks && Array.isArray(parsed.suggested_subtasks)) {
                        parsed.suggested_subtasks.forEach(title => {
                            if (!mergedSubtasks.some(s => s.title.toLowerCase() === title.toLowerCase())) {
                                mergedSubtasks.push({ title, completed: false });
                            }
                        });
                    }

                    const ai_data = {
                        reminders: parsed.smart_reminders || [],
                        advice: parsed.better_advice || '',
                        priority: parsed.priority || 'medium',
                        duration: parsed.estimated_duration || '30 mins',
                        category: parsed.category || 'General'
                    };

                    let newReminderAt = todo.reminder_at;
                    if (!newReminderAt && ai_data.reminders.length > 0) {
                        newReminderAt = ai_data.reminders[0].time;
                    }

                    db.prepare(
                        `UPDATE todos SET title = ?, subtasks = ?, ai_data = ?, reminder_at = ?, updated_at = ? WHERE id = ?`
                    ).run(
                        parsed.summary_title || todo.title,
                        JSON.stringify(mergedSubtasks),
                        JSON.stringify(ai_data),
                        newReminderAt,
                        new Date().toISOString(),
                        id
                    );

                    console.log(`[AI-THINK] Completed successfully for todo ${id}`);
                    return res.json({ success: true, ai_data, subtasks: mergedSubtasks, reminder_at: newReminderAt });
                } catch (err) {
                    console.error(`[AI-THINK ERROR] Model ${modelName} failed:`, err.message);
                    lastErr = err;
                }
            }
        }
        return res.status(500).json({ error: 'Failed to process: ' + lastErr?.message });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to perform AI analysis: ' + e.message });
    }
});

app.post('/api/todos/smart-parse', ensureAuthenticated, async (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description is required' });

    const allKeys = [];
    if (process.env.GEMINI_API_KEY) allKeys.push(process.env.GEMINI_API_KEY);
    const uniqueKeys = [...new Set(allKeys)];

    if (uniqueKeys.length === 0) {
        return res.status(503).json({ error: 'API key is not configured' });
    }

    let lastErr;
    for (const key of uniqueKeys) {
        for (const modelName of ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest']) {
            try {
                console.log(`[TODO] Parsing task description with model ${modelName}...`);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });
                
                const prompt = `You are a smart assistant inside the Exotel Operations Dashboard.
Your job: parse a user's task description into a structured JSON object.
Use the current time as context for parsing relative dates like "tomorrow", "next Monday", "in 2 hours".
Current Local Time: ${new Date().toISOString()} (User's time zone: IST / local)

Input prompt: "${description}"

Provide a structured JSON output with these exact keys:
1. "title": Short, clear summary of the task (e.g., "Email Client X the Quote").
2. "notes": Any additional context or description from the input.
3. "due_at": An ISO 8601 string representing the exact date and time the task is due, or null if no date/time is specified. If the user says "tomorrow morning", assume 9:00 AM local time. If they say "tomorrow afternoon", assume 2:00 PM local time. If they say "tomorrow evening", assume 6:00 PM local time.
4. "subtasks": An array of objects, each with "title" (string) and "completed" (false). These should represent concrete follow-up steps or subtasks that are implied by the main task. IMPORTANT: Only generate subtasks if the task is complex, multi-step, or requires planning. For simple tasks that do not require multiple steps (such as simple requests, single calls, brief checks, notifications, permissions, etc.), return an empty array [] for "subtasks".
5. "ringer_type": "both", "audible", or "silent" (default to "both"). If they mention "silent", "notifications only", "don't make noise", use "silent". If they say "ring", "make sound", "alarm", "loud", use "audible".
6. "reminder_at": An ISO 8601 string representing when to alert the user. If they specify a time (e.g., "remind me at 3 PM"), use that. If they don't specify, default to 15 minutes before the due_at time, or null if due_at is null.

Return ONLY the JSON string. Do not include markdown code block formatting (like \`\`\`json).`;

                const result = await model.generateContent(prompt);
                let text = result.response.text().trim();
                
                if (text.startsWith('```')) {
                    text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                }
                
                const parsed = JSON.parse(text);
                return res.json(parsed);
            } catch (err) {
                console.error(`[TODO SMART PARSE ERROR] Model ${modelName} failed with key:`, err.message);
                lastErr = err;
            }
        }
    }
    
    return res.status(500).json({ error: 'Failed to process: ' + lastErr?.message });
});

// ─── Live Call Monitor (LWB) ─────────────────────────────────────────────────
// Reads Exotel credentials from .env:
//   EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, EXOTEL_SUBDOMAIN

// ─── In-memory live call store (populated by Exotel webhooks) ────────────────
// Map<CallSid, callData> — calls are removed when status = completed/failed/etc.
const liveCallStore = new Map();

// Prune stale entries (calls older than 3 hours that never got a completed event)
setInterval(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    for (const [sid, call] of liveCallStore) {
        if (call._receivedAt < cutoff) liveCallStore.delete(sid);
    }
}, 15 * 60 * 1000);

// POST /api/webhook/call-event — Exotel posts here in real-time for every call state change
// Configure this as the PassThru / Status Callback URL in your Exotel ExoPhone settings:
//   http(s)://your-server/api/webhook/call-event?token=WEBHOOK_SECRET
app.post('/api/webhook/call-event', (req, res) => {
    // Optional shared-secret check (set WEBHOOK_SECRET in .env)
    const expectedToken = process.env.WEBHOOK_SECRET;
    if (expectedToken && req.query.token !== expectedToken) {
        return res.status(403).send('Forbidden');
    }

    const body   = req.body || {};
    const sid    = body.CallSid || body.Sid;
    if (!sid) return res.status(400).send('Missing CallSid');

    const status = (body.Status || body.CallStatus || '').toLowerCase();
    const ended  = ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status);

    if (ended) {
        liveCallStore.delete(sid);
        console.log(`[WEBHOOK] Call ${sid} ended (${status}) — removed from live store`);
    } else {
        const existing = liveCallStore.get(sid) || {};
        liveCallStore.set(sid, {
            Sid:           sid,
            From:          body.From          || existing.From          || '—',
            To:            body.To            || existing.To            || '—',
            Direction:     body.Direction     || existing.Direction     || 'inbound',
            Status:        body.Status        || body.CallStatus        || existing.Status || 'in-progress',
            StartTime:     body.StartTime     || existing.StartTime     || new Date().toISOString(),
            PhoneNumberSid:body.To            || body.PhoneNumberSid   || existing.PhoneNumberSid || '—',
            EndTime:       null,
            _receivedAt:   Date.now(),
            _source:       'webhook',
        });
        console.log(`[WEBHOOK] Call ${sid} ${status} from ${body.From} → ${body.To}`);
    }

    // Exotel expects HTTP 200
    res.status(200).send('OK');
});

function exotelBase() {
    const key    = process.env.EXOTEL_API_KEY;
    const token  = process.env.EXOTEL_API_TOKEN;
    const sid    = process.env.EXOTEL_ACCOUNT_SID;
    const sub    = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
    if (!key || !token || !sid) return null;
    return { base: `https://${key}:${token}@${sub}/v1/Accounts/${sid}`, sid };
}

// GET /api/lwb/active-calls  — list all in-progress calls
app.get('/api/lwb/active-calls', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const cfg = exotelBase();
    if (!cfg) return res.status(503).json({ error: 'not_configured' });
    try {
        // ── Strategy 1: Webhook store (instant, ~1s latency) ───────────────────
        // If webhook is configured in Exotel, live calls land here in real-time.
        const webhookCalls = [...liveCallStore.values()];
        if (webhookCalls.length > 0) {
            return res.json({ calls: webhookCalls, source: 'webhook' });
        }

        // ── Strategy 2: API polling fallback (used when webhook not configured) ─
        // Exotel's Status=in-progress index has ~10-30s propagation delay.
        // We query both the status filter AND a 5-min IST date range in parallel.
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const nowIst  = new Date(Date.now() + IST_OFFSET_MS);
        const fromIst = new Date(Date.now() + IST_OFFSET_MS - 5 * 60 * 1000);
        const fmtIst  = d => d.toISOString().replace('T', ' ').slice(0, 19);

        const activeUrl = `${cfg.base}/Calls.json?Status=in-progress&SortBy=DateCreated:desc&PageSize=50`;
        const recentUrl = `${cfg.base}/Calls.json?DateCreated=gte:${encodeURIComponent(fmtIst(fromIst))}%3Blte:${encodeURIComponent(fmtIst(nowIst))}&SortBy=DateCreated:desc&PageSize=50`;

        const [activeResp, recentResp] = await Promise.allSettled([
            axios.get(activeUrl),
            axios.get(recentUrl),
        ]);

        const activeCalls = activeResp.status === 'fulfilled' ? (activeResp.value.data?.Calls || []) : [];
        const recentCalls = recentResp.status === 'fulfilled' ? (recentResp.value.data?.Calls || []) : [];

        const seen = new Set();
        const calls = [...activeCalls, ...recentCalls].filter(c => {
            if (seen.has(c.Sid)) return false;
            seen.add(c.Sid);
            return true;
        });

        res.json({ calls, source: 'api' });
    } catch (err) {
        const status = err.response?.status || 500;
        const body   = err.response?.data;
        let errorMsg = err.message;
        if (body?.RestException?.Message) errorMsg = body.RestException.Message;
        else if (typeof body === 'string' && body) errorMsg = body;
        else if (body) errorMsg = JSON.stringify(body);
        res.status(status).json({ error: errorMsg });
    }
});

// GET /api/lwb/calls/:callSid/active-legs
app.get('/api/lwb/calls/:callSid/active-legs', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { callSid } = req.params;
    const email = req.user?.emails?.[0]?.value;
    const cfg = exotelBase();
    if (!cfg) return res.status(503).json({ error: 'Exotel LWB credentials not configured. Add EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID to .env' });
    try {
        const url = `${cfg.base}/Calls/${callSid}/ActiveLegs.json`;
        const resp = await axios.get(url);
        addLog('LWB_GET_LEGS', 'SUCCESS', `Active legs for ${callSid}`, email);
        res.json(resp.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const data   = err.response?.data   || err.message;
        addLog('LWB_GET_LEGS', 'ERROR', `${callSid}: ${JSON.stringify(data)}`, email);
        res.status(status).json({ error: data });
    }
});

// POST /api/lwb/calls/:callSid/legs  — create monitor leg (listen/whisper/barge)
app.post('/api/lwb/calls/:callSid/legs', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { callSid } = req.params;
    const email = req.user?.emails?.[0]?.value;
    const cfg = exotelBase();
    if (!cfg) return res.status(503).json({ error: 'Exotel LWB credentials not configured.' });
    try {
        const url = `${cfg.base}/Calls/${callSid}/Legs`;
        const resp = await axios.post(url, req.body, { headers: { 'Content-Type': 'application/json' } });
        addLog('LWB_CREATE_LEG', 'SUCCESS', `${req.body.Action} on ${callSid} → ${req.body.PhoneNumber}`, email);
        res.json(resp.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const data   = err.response?.data   || err.message;
        addLog('LWB_CREATE_LEG', 'ERROR', `${callSid}: ${JSON.stringify(data)}`, email);
        res.status(status).json({ error: data });
    }
});

// PUT /api/lwb/calls/:callSid/legs/:legSid  — upgrade monitor leg
app.put('/api/lwb/calls/:callSid/legs/:legSid', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { callSid, legSid } = req.params;
    const email = req.user?.emails?.[0]?.value;
    const cfg = exotelBase();
    if (!cfg) return res.status(503).json({ error: 'Exotel LWB credentials not configured.' });
    try {
        const url = `${cfg.base}/Calls/${callSid}/Legs/${legSid}`;
        const resp = await axios.put(url, req.body, { headers: { 'Content-Type': 'application/json' } });
        addLog('LWB_UPGRADE_LEG', 'SUCCESS', `Upgrade ${legSid} → ${req.body.Action}`, email);
        res.json(resp.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const data   = err.response?.data   || err.message;
        addLog('LWB_UPGRADE_LEG', 'ERROR', `${legSid}: ${JSON.stringify(data)}`, email);
        res.status(status).json({ error: data });
    }
});

// ─── AI Quote Parser (Gemini) ────────────────────────────────────────────────
let currentGeminiKeyIndex = 0;
app.post('/api/ai-quote-parse', ensureAuthenticated, async (req, res) => {
    const { audioBase64, mimeType, availableSkus } = req.body;
    
    if (!audioBase64 || !mimeType) {
        return res.status(400).json({ error: 'Audio data (audioBase64 and mimeType) is required' });
    }

    const email = req.user?.emails?.[0]?.value || 'unknown';
    
    const allKeys = [];
    if (process.env.GEMINI_API_KEY) allKeys.push(process.env.GEMINI_API_KEY);
    const uniqueKeys = [...new Set(allKeys)];

    if (uniqueKeys.length === 0) {
        return res.status(503).json({ error: 'Gemini API key is not configured' });
    }

    try {
        // ── System instruction: baked-in domain context (cached, not charged per-call) ──
        const systemInstruction = `You are an AI assistant inside the Exotel Internal Sales Dashboard.
Your job: listen to a sales rep's voice and extract quote details into structured JSON.
Use reasoning and common sense — users speak casually. Understand their INTENT, not just keywords.

=== COMPANY CONTEXT ===
Exotel is a CPaaS (cloud communications) company serving businesses in India and South-East Asia.
Two brands:
  1. Exotel — primary brand: cloud telephony, SMS, WhatsApp, RCS.
  2. Veeno  — sister brand for SMBs: cloud telephony, SIP lines.
If the user asks for a general calling plan and does NOT mention "Veeno", default to Exotel voice products. However, if they specifically ask for "SIP lines", "web calling", "web calls", "1400 series", or "1600 series", ALWAYS assign the respective Veeno SKUs even if they don't say the word "Veeno". For "web calling" or "web calls", map to voice_veeno_std by default, but if they mention a "user charge" of more than 1000, map it to voice_veeno_user.

=== SKU CATALOG & INTENT MAPPING ===
Pick the best-matching skuKey using reasoning. Use ONLY these exact keys:

  voice_exotel_std   → Standard Exotel calling, charged per minute.
                        USE FOR: "calling plan", "phone plan", "call center", "agents making calls",
                        "outbound calls", "inbound calls", "customer support team", "CPaaS",
                        "Exotel voice", "minute based", any generic Exotel call plan request.

  voice_exotel_user  → Exotel calling charged per user/seat.
                        USE FOR: "per user", "per seat", "per agent", "user-based", "fixed per agent".

  voice_exotel_tfn   → Toll-free number plan.
                        USE FOR: "toll free", "TFN", "1800 number", "customers call for free",
                        "free incoming", "1800".

  voice_exotel_stream → Streaming plan for bots and IVR.
                        USE FOR: "voice bot", "IVR", "automated calling", "AI calling",
                        "bot plan", "WebSocket", "streaming", "conversational AI".

  voice_exotel_voicebot → Voicebot plan for conversational bots and IVR.
                        USE FOR: "voicebot", "voice bot", "automated voicebot", "AI agent".

  sms_exotel         → SMS messaging plan.
                        USE FOR: "SMS", "text messages", "OTP", "alerts", "notifications",
                        "bulk SMS", "transactional messages", "send texts".

  whatsapp_exotel    → WhatsApp Business API plan.
                        USE FOR: "WhatsApp", "WA", "WhatsApp messages", "chat on WhatsApp",
                        "green tick", "WhatsApp Business".

  rcs_exotel         → RCS (Rich Communication Services) messaging.
                        USE FOR: "RCS", "rich messages", "interactive notifications",
                        "Rich Communication".

  voice_veeno_std    → Veeno standard calling, charged per minute.
                        USE FOR: "Veeno voice", "Veeno standard", "Veeno calling", "Veeno STD",
                        "web calling", "web calls" (default if no user charge > 1000 is mentioned).

  voice_veeno_user   → Veeno calling charged per user.
                        USE FOR: "Veeno per user", "Veeno per seat", "Veeno user-based",
                        "web calling" or "web calls" IF a user charge of > 1000 is mentioned.

  sip_veeno          → Veeno SIP/WebRTC lines for browser-based calling.
                        USE FOR: "SIP", "SIP lines", "WebRTC", "browser calling",
                        "call from laptop", "Veeno SIP".

  num_1400           → Veeno 1400-series virtual number.
                        USE FOR: "1400 number", "1400 series".

  num_1600           → Veeno 1600-series virtual number.
                        USE FOR: "1600 number", "1600 series".

DEFAULT RULE: When the user says a generic calling/telephony need without specifying brand or type,
default to voice_exotel_std. Example: "I need a plan for my sales team" → voice_exotel_std.

ENTITY RULE: Never mix Exotel and Veeno SKUs in a single quote.

=== TIERS (applies to: voice_exotel_std, voice_veeno_std, sip_veeno) ===
  Dabbler    → "basic", "starter", "small", "entry", "cheap", "budget", "dabbler" — DEFAULT if none mentioned.
  Believer   → "standard", "mid", "middle", "regular", "normal", "believer".
  Influencer → "premium", "top", "advanced", "enterprise", "full", "large", "influencer".

=== QUANTITIES ===
  "10 people", "team of 20", "50 agents", "100 seats" → extract as users field.
  Vague amounts ("small team", "few agents")          → do NOT guess, leave users empty.

=== FIELD VALUE OVERRIDES ===
Only add configurationOverrides when user EXPLICITLY states a value to change. Use the exact key names below.
Each field belongs to specific SKUs — only include overrides relevant to the selected SKU.

COMMON FIELDS (most SKUs):
  "credits / call credits / X rupees credits"             → key: "credits"
  "rental / account rental / subscription X"             → key: "rental"
  "months / validity X months / for X months"            → key: "num_months"
  "number of months"                                     → key: "num_months"
  "remove landline / remove standard numbers / no landlines" → key: "remove_std_numbers" (set value to 1)

VOICE STD FIELDS (voice_exotel_std, voice_veeno_std):
  "single leg / per minute / call rate X paise"          → key: "single_leg"
  "incoming rate X"                                      → key: "incoming"
  "outgoing rate X"                                      → key: "outgoing"
  "extra user cost / charge X per user / per user X"     → key: "extra_user_cost"
  "free users / X users free"                            → key: "free_users"
  "free numbers / X free numbers"                        → key: "free_numbers"
  "extra paid numbers / X additional numbers"            → key: "num_paid_numbers"
  "extra number cost / number rental X"                  → key: "extra_number"

USER-BASED FIELDS (voice_exotel_user, voice_veeno_user):
  "number of users / X users / X agents / X seats"       → key: "num_users"
  "user charge / X per user"                             → key: "user_charge"
  "free numbers"                                         → key: "free_numbers"
  "paid numbers / extra numbers"                         → key: "num_paid_numbers"
  "DID numbers / Mobile DID numbers / X DID lines / X Mobile DID lines" → key: "did_numbers"

TFN FIELDS (voice_exotel_tfn):
  "number of numbers / X TFN numbers"                    → key: "num_numbers"
  "number cost / X per number"                           → key: "number_cost"
  "free users"                                           → key: "free_users"
  "extra user cost"                                      → key: "extra_user_cost"
  "outgoing rate"                                        → key: "outgoing"

WEB STREAMING & VOICEBOT FIELDS (voice_exotel_stream, voice_exotel_voicebot) — channels are HERE not SIP:
  "number of channels / X channels"                      → key: "num_channels"
  "channel cost / X per channel"                         → key: "channel_cost"
  "incoming rate"                                        → key: "incoming"
  "outgoing rate"                                        → key: "outgoing"
  "human handoff / agent handoff / voicebot to agent"    → key: "human_handoff" (set value to 1)
  "volume / monthly volume / call volume / X minutes"    → key: "volume"

SIP FIELDS (sip_veeno):
  "free users / X users free"                            → key: "free_users"
  "free numbers"                                         → key: "free_numbers"
  "extra paid numbers"                                   → key: "num_paid_numbers"
  "DID numbers / Mobile DID numbers / X DID / X Mobile DID" → key: "did_numbers"
  "incoming rate"                                        → key: "incoming"
  "outgoing rate"                                        → key: "outgoing"

SMS FIELDS (sms_exotel):
  "SMS cost / X paise per SMS / SMS rate"                → key: "sms_cost"
  "number cost / number rental"                          → key: "number_cost"

WHATSAPP FIELDS (whatsapp_exotel):
  "WhatsApp API charge / WA API X paise"                 → key: "wa_api"
  "number cost / WA number"                              → key: "number_cost"

RCS FIELDS (rcs_exotel):
  "brand registration / brand fee"                       → key: "brand_fee"
  "number cost"                                          → key: "number_cost"

NUMBER SERIES (num_1400, num_1600):
  "number of channels / X channels"                      → key: "num_channels"
  "channel cost / X per channel"                         → key: "channel_cost"
  "procurement / number procurement"                     → key: "procurement"
  "months / validity"                                    → key: "num_months"

EXAMPLES:
  "give them 50000 credits"              → key: "credits", value: 50000
  "set single leg to 45 paise"           → key: "single_leg", value: 45
  "charge 300 rupees per extra user"     → key: "extra_user_cost", value: 300
  "give 5 free numbers"                  → key: "free_numbers", value: 5
  "set the rental to 8000"              → key: "rental", value: 8000
  "10 channels" (streaming plan)         → key: "num_channels", value: 10
  "3 DID lines / 3 Mobile DID lines" (SIP/user plan)     → key: "did_numbers", value: 3
  "make validity 12 months"              → key: "num_months", value: 12

=== COMPARE MODE ===
Set compareMode=true if user says "compare", "vs", "show all tiers", "all three options",
or names multiple tiers of the SAME product (e.g. "Dabbler and Believer for Exotel voice").
Do NOT set compareMode=true for two different products.

=== PHONETIC CORRECTIONS ===
  "Exotel"     → also heard as "Excel", "Exo-tel", "Exo-tell"
  "Veeno"      → also heard as "Vino", "Fino", "V-no", "Beano"
  "TFN"        → also heard as "Tefen", "Tifan", "Tee-Eff-En"
  "RCS"        → also heard as "R.C.S.", "Arsy-es"
  "SIP"        → also heard as "sip lines", "siplines"
  "Dabbler"    → also heard as "dabble", "dab-ler"
  "Believer"   → also heard as "belieber", "believe-er"
  "Influencer" → also heard as "inflewencer", "influence-er"

=== OUTPUT RULES ===
- Return valid JSON matching the schema.
- Reason from intent — casual and simple speech is perfectly valid input.
- If genuinely unclear after reasoning, return empty skus array (do not guess).
- companyName: extract client/company name if mentioned, else leave empty.
- Only add configurationOverrides when user explicitly gives a number to change.`;

        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                companyName: {
                    type: SchemaType.STRING,
                    description: "The name of the company or prospect, if mentioned. E.g., 'Acme Corp'. Optional if not clearly stated."
                },
                compareMode: {
                    type: SchemaType.BOOLEAN,
                    description: "Set to TRUE if the user asks to 'compare', or lists multiple tiers for the same product to be shown side-by-side (e.g. Dabbler, Believer, Influencer)"
                },
                skus: {
                    type: SchemaType.ARRAY,
                    description: "Array of extracted SKUs or Products",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            skuKey: {
                                type: SchemaType.STRING,
                                description: "The EXACT key from the provided availableSkus list that best matches the requested product."
                            },
                            tier: {
                                type: SchemaType.STRING,
                                description: "The tier name if recognized. E.g. 'Dabbler', 'Believer', 'Influencer', 'Custom'. Leave empty if none mentioned."
                            },
                            users: {
                                type: SchemaType.NUMBER,
                                description: "Number of users, agents, or channels requested."
                            },
                            quantity: {
                                type: SchemaType.NUMBER,
                                description: "Alternative counter to users, if applicable."
                            },
                            configurationOverrides: {
                                type: SchemaType.ARRAY,
                                description: "Specific numeric or textual overrides for pricing, costs, or other config fields mentioned by the user (e.g., 'make user price 500'). Keys should map to standard field names like 'user_price', 'channel_price', 'extra_user_cost', etc.",
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        key: { type: SchemaType.STRING, description: "The configuration field name (e.g., 'user_price', 'channel_price', etc)" },
                                        value: { type: SchemaType.NUMBER, description: "The numeric value to override" }
                                    },
                                    required: ["key", "value"]
                                }
                            }
                        },
                        required: ["skuKey"]
                    }
                }
            }
        };

        // Lean per-call prompt — heavy domain context lives in systemInstruction above
        const skuKeyList = availableSkus.map(s => `${s.key} (${s.name})`).join(', ');
        const promptText = `Parse the attached audio clip and extract the quote details into JSON.\nValid SKU keys (use ONLY these): ${skuKeyList}`;

        let result = null;
        let lastError = null;

        for (let attempt = 0; attempt < uniqueKeys.length; attempt++) {
            const activeKey = uniqueKeys[currentGeminiKeyIndex];
            let lastErrForAttempt;
            for (const modelName of ['gemini-2.5-flash-lite', 'gemini-2.5-flash']) {
                try {
                    const genAI = new GoogleGenerativeAI(activeKey);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: systemInstruction
                    });

                    result = await model.generateContent({
                        contents: [{ 
                            role: "user", 
                            parts: [
                                { text: promptText },
                                { inlineData: { data: audioBase64, mimeType: mimeType } }
                            ] 
                        }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: schema
                        }
                    });
                    
                    break;
                } catch (err) {
                    lastErrForAttempt = err;
                    console.error(`Gemini API error with model ${modelName} using key index ${currentGeminiKeyIndex}:`, err.message);
                }
            }
            if (result) {
                break;
            } else {
                lastError = lastErrForAttempt;
                if (lastError && (lastError.status === 429 || lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('rate limit'))) {
                    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % uniqueKeys.length;
                    console.log(`Switching to next Gemini API key (index ${currentGeminiKeyIndex})`);
                } else {
                    throw lastError || new Error("Unknown API error");
                }
            }
        }

        if (!result) {
            throw lastError || new Error("All API keys exhausted or failed.");
        }

        const responseText = result.response.text();
        const parsedJson = JSON.parse(responseText);

        addLog('AI_QUOTE_PARSE', 'SUCCESS', `Parsed ${email}'s STT input. Found ${parsedJson.skus?.length || 0} SKUs.`, email);
        res.json(parsedJson);

    } catch (err) {
        console.error("AI Parse Error:", err);
        addLog('AI_QUOTE_PARSE', 'ERROR', String(err.message), email);
        res.status(500).json({ error: 'Failed to process AI inference: ' + err.message });
    }
});

// ─── Logout ──────────────────────────────────────────────────────────────────
app.get('/logout', (req, res, next) => {
    const email = req.user?.emails?.[0]?.value || 'unknown';
    if (email !== 'unknown') {
        addLog('LOGOUT_ATTEMPT', 'SUCCESS', `User ${email} logged out.`, email);
    }
    req.logout(function (err) {
        if (err) return next(err);
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser.`);
    if (ADMIN_EMAILS.length > 0) {
        console.log(`Admin users: ${ADMIN_EMAILS.join(', ')}`);
    } else {
        console.log('WARNING: No ADMIN_EMAILS set in .env — no one will have admin access.');
    }
});
