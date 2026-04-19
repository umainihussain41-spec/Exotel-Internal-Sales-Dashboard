const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

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
const db = new Database(path.join(__dirname, 'logs.db'));

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
`);

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true })); // Exotel webhooks send form-encoded
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'exotel-secret-key-123',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: false,
        maxAge: 30 * 60 * 1000
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
        const exotelEmail = profile.emails.find(email => email.value.endsWith('@exotel.com'));
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
            return cb(null, false, { message: "Only @exotel.com emails are allowed" });
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
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1024, height: 800 }
        });
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

// ─── Developer Feedback ──────────────────────────────────────────────────────
app.post('/api/feedback', ensureAuthenticated, (req, res) => {
    const email = req.user?.emails?.[0]?.value;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const now = new Date().toISOString();
    try {
        db.prepare(`INSERT INTO dev_feedback (user_email, message, created_at) VALUES (?, ?, ?)`).run(email, message, now);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to submit feedback' });
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
    
    const fallbackKeys = [
        'AIzaSyAxM1nG9fnwAx3pGT7i4PwGbqI5cC09AwQ',
        'AIzaSyAMTxuUeDhjh9a9PI4g3fJI_n5A70L5ekI'
    ];
    
    const allKeys = [];
    if (process.env.GEMINI_API_KEY) allKeys.push(process.env.GEMINI_API_KEY);
    allKeys.push(...fallbackKeys);
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
  "DID numbers / X DID lines"                            → key: "did_numbers"

TFN FIELDS (voice_exotel_tfn):
  "number of numbers / X TFN numbers"                    → key: "num_numbers"
  "number cost / X per number"                           → key: "number_cost"
  "free users"                                           → key: "free_users"
  "extra user cost"                                      → key: "extra_user_cost"
  "outgoing rate"                                        → key: "outgoing"

WEB STREAMING FIELDS (voice_exotel_stream) — channels are HERE not SIP:
  "number of channels / X channels"                      → key: "num_channels"
  "channel cost / X per channel"                         → key: "channel_cost"
  "incoming rate"                                        → key: "incoming"
  "outgoing rate"                                        → key: "outgoing"

SIP FIELDS (sip_veeno):
  "free users / X users free"                            → key: "free_users"
  "free numbers"                                         → key: "free_numbers"
  "extra paid numbers"                                   → key: "num_paid_numbers"
  "DID numbers / X DID"                                  → key: "did_numbers"
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
  "3 DID lines" (SIP/user plan)          → key: "did_numbers", value: 3
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
            try {
                const genAI = new GoogleGenerativeAI(activeKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
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
                
                // Success, break out of retry loop
                break;
            } catch (err) {
                lastError = err;
                console.error(`Gemini API error with key index ${currentGeminiKeyIndex}:`, err.message);
                if (err.status === 429 || err.message.includes('429') || err.message.includes('quota') || err.message.includes('rate limit')) {
                    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % uniqueKeys.length;
                    console.log(`Switching to next Gemini API key (index ${currentGeminiKeyIndex})`);
                } else {
                    throw err;
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
