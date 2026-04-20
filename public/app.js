// Global State
let parsedUsers = [];
let availableExophones = [];
let isProcessing = false;

// Navigation history stack for browser back-button support
const _navHistory = [];
let _navIsPopping = false; // prevents re-push when handling popstate

// DOM Elements
const els = {
    navButtons: document.querySelectorAll('.nav-item'),
    applets: document.querySelectorAll('.applet'),
    userBadge: document.getElementById('user-badge'),
    btnBackHome: document.getElementById('btn-back-home'),
    timeGreeting: document.getElementById('time-greeting'),

    // Mobile
    burgerBtn: document.getElementById('burger-btn'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),

    // Config (sidebar API settings drawer)
    btnOpenApiSettings: document.getElementById('btn-open-api-settings'),

    // Users
    csvFile: document.getElementById('csv-file'),
    usersPreview: document.getElementById('users-preview'),
    usersTableBody: document.getElementById('users-table-body'),
    previewCount: document.getElementById('preview-count'),
    btnProcessUsers: document.getElementById('btn-process-users'),
    selectAllUsers: document.getElementById('selectAll-users'),
    btnVerifyAll: null, // Moved to Verify Users applet
    downloadSampleCsv: document.getElementById('download-sample-csv'),

    // Quick Verify
    quickVerifyFrom: document.getElementById('quick-verify-from'),
    btnQuickVerify: document.getElementById('btn-quick-verify'),
    quickVerifyResult: document.getElementById('quick-verify-result'),

    // Exophones
    btnFetchExo: document.getElementById('btn-fetch-exo'),
    exoPreview: document.getElementById('exo-preview'),
    exoCount: document.getElementById('exo-count'),
    exoList: document.getElementById('exo-list'),
    btnDownloadExo: document.getElementById('btn-download-exo'),
    exoAllocateCount: document.getElementById('exo-allocate-count'),
    btnAllocateExo: document.getElementById('btn-allocate-exo'),

    // Logs
    logsTableBody: document.getElementById('logs-table-body'),
    btnRefreshLogs: document.getElementById('btn-refresh-logs'),

    // Admin Logs
    adminLogsTableBody: document.getElementById('admin-logs-table-body'),
    btnRefreshAdminLogs: document.getElementById('btn-refresh-admin-logs'),
    adminLogSearch: document.getElementById('admin-log-search'),
    adminLogStatusFilter: document.getElementById('admin-log-status-filter'),

    // Terminal
    terminalSection: document.getElementById('terminal-section'),
    terminalOutput: document.getElementById('terminal-output'),
    btnClearTerminal: document.getElementById('btn-clear-terminal')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // ── Back-button trap ──────────────────────────────────────────
    // /login is a different server path. popstate won't fire when
    // the browser navigates back to it - only a full page load happens.
    // Fix: replace the current entry then push 5 extras as a cushion
    // so there are always in-app history entries to go back through.
    history.replaceState({ navTarget: 'home' }, '', window.location.pathname);
    for (let i = 0; i < 5; i++) {
        history.pushState({ navTarget: 'home' }, '', window.location.pathname);
    }
    _navHistory.push('home');
    // ─────────────────────────────────────────────────────────────

    checkUser();
    setupNavigation();
    setupMobileSidebar();
    setupConfigPanel();
    setupUsersApplet();
    setupExophonesApplet();
    setupLogsApplet();
    setupAdminPanel();
    setupFeedbackSystem();
    setupDevFeedbackApplet();
    setTimeGreeting();

    els.btnClearTerminal.addEventListener('click', () => {
        els.terminalOutput.innerHTML = '';
        els.terminalSection.classList.add('hidden');
    });

    // Prevent browser from opening dragged files natively
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    }, false);
    window.addEventListener('drop', (e) => {
        e.preventDefault();
    }, false);
});

async function checkUser() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            const user = await res.json();
            els.userBadge.textContent = user.emails[0].value;
            // Check admin status after user is confirmed
            await checkAdminStatus();
            // Check developer status (Strictly restricted to hussain.umaini@exotel.com)
            await checkDeveloperStatus();
        } else {
            window.location.href = '/login';
        }
    } catch (e) {
        window.location.href = '/login';
    }
}

async function checkAdminStatus() {
    try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
            const data = await res.json();
            if (data.isAdmin) {
                const navAdmin = document.getElementById('nav-admin');
                if (navAdmin) navAdmin.classList.remove('hidden');
                const cardAdmin = document.getElementById('home-card-admin');
                if (cardAdmin) cardAdmin.classList.remove('hidden');
                // Show admin in mobile bottom nav
                const mbnAdmin = document.getElementById('mbn-admin');
                if (mbnAdmin) mbnAdmin.style.removeProperty('display');
                // Live Monitor (admin only)
                document.getElementById('nav-live-monitor')?.classList.remove('hidden');
                document.getElementById('home-card-live-monitor')?.classList.remove('hidden');
            }
        }
    } catch (e) {
        // Not admin or error - no-op
    }
}

async function checkDeveloperStatus() {
    try {
        const res = await fetch('/api/developer/check');
        if (res.ok) {
            const data = await res.json();
            if (data.isDeveloper) {
                document.getElementById('nav-dev-feedback')?.classList.remove('hidden');
                document.getElementById('home-card-dev-feedback')?.classList.remove('hidden');
            }
        }
    } catch (e) {
        // Not developer or error - no-op
    }
}

function setTimeGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    els.timeGreeting.textContent = greeting;
}

// ── API Settings Drawer ───────────────────────────────────────────────────
window.openApiSettings = function(bannerMsg) {
    const drawer   = document.getElementById('api-drawer');
    const backdrop = document.getElementById('api-drawer-backdrop');
    const banner   = document.getElementById('api-drawer-banner');
    const bannerTxt = document.getElementById('api-drawer-banner-text');
    if (!drawer) return;

    // Show backdrop + drawer
    backdrop.style.display = 'block';
    drawer.style.display   = 'flex';
    requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        drawer.style.transform = 'translateX(0)';
    });

    // Optional contextual banner
    if (bannerMsg && banner && bannerTxt) {
        bannerTxt.textContent = bannerMsg;
        banner.style.display = 'flex';
    } else if (banner) {
        banner.style.display = 'none';
    }
};

window.closeApiSettings = function() {
    const drawer   = document.getElementById('api-drawer');
    const backdrop = document.getElementById('api-drawer-backdrop');
    if (!drawer) return;
    backdrop.style.opacity = '0';
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => {
        backdrop.style.display = 'none';
        drawer.style.display   = 'none';
    }, 350);
};

function setupConfigPanel() {
    // Sidebar button
    if (els.btnOpenApiSettings) {
        els.btnOpenApiSettings.addEventListener('click', () => window.openApiSettings());
    }

    // Save Settings
    const btnSaveConfig = document.getElementById('btn-close-config-save');
    if (btnSaveConfig) {
        btnSaveConfig.addEventListener('click', () => {
            const sid      = (document.getElementById('cfg-sid')      || {}).value?.trim() || '';
            const key      = (document.getElementById('cfg-key')      || {}).value?.trim() || '';
            const token    = (document.getElementById('cfg-token')    || {}).value?.trim() || '';
            const subdomain = (document.getElementById('cfg-subdomain') || {}).value?.trim() || 'singapore';

            if (!sid || !key) {
                showToast('Please enter at least an Account SID and API Key.', 'warning');
                return;
            }
            sessionStorage.setItem('exo_sid',       sid);
            sessionStorage.setItem('exo_key',       key);
            sessionStorage.setItem('exo_token',     token);
            sessionStorage.setItem('exo_subdomain', subdomain);

            window.closeApiSettings();
            showToast('API Settings saved for this session.', 'success');
            logTerminal('API Settings saved for this session.', 'success');
        });
    }

    // Restore saved settings on boot - elements may not exist yet, defer
    document.addEventListener('DOMContentLoaded', () => {}, { once: true });
    setTimeout(() => {
        const saved = {
            sid:       sessionStorage.getItem('exo_sid'),
            key:       sessionStorage.getItem('exo_key'),
            token:     sessionStorage.getItem('exo_token'),
            subdomain: sessionStorage.getItem('exo_subdomain'),
        };
        if (saved.sid)       { const el = document.getElementById('cfg-sid');       if (el) el.value = saved.sid; }
        if (saved.key)       { const el = document.getElementById('cfg-key');       if (el) el.value = saved.key; }
        if (saved.token)     { const el = document.getElementById('cfg-token');     if (el) el.value = saved.token; }
        if (saved.subdomain) { const el = document.getElementById('cfg-subdomain'); if (el) el.value = saved.subdomain; }
    }, 0);
}

// Navigation & State Management
window.openApp = function (target) {
    // Push to internal history stack (unless we're handling a popstate)
    if (!_navIsPopping) {
        const current = _navHistory.length > 0 ? _navHistory[_navHistory.length - 1] : null;
        if (current !== target) {
            _navHistory.push(target);
            // Push a state so browser knows there's history to go back through
            history.pushState({ navTarget: target }, '', window.location.pathname);
        }
    }

    // Top bar updates
    if (target === 'home') {
        document.body.className = 'home-state';
        els.btnBackHome.classList.add('hidden');
        els.timeGreeting.classList.remove('hidden');
    } else {
        document.body.className = 'app-state';
        els.btnBackHome.classList.remove('hidden');
        els.timeGreeting.classList.add('hidden');
    }

    // Auto-collapse sidebar on mobile when an applet is opened
    const _sidebar = document.getElementById('sidebar');
    const _overlay = document.getElementById('sidebar-overlay');
    if (_sidebar) _sidebar.classList.remove('sidebar-open');
    if (_overlay) _overlay.classList.remove('active');

    // Update active nav item
    els.navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === target) {
            btn.classList.add('active');
        }
    });

    // Show target applet
    els.applets.forEach(app => {
        if (app.id === `${target}-applet`) {
            app.classList.remove('hidden');
        } else {
            app.classList.add('hidden');
        }
    });

    // Sync mobile bottom nav active state
    document.querySelectorAll('.mbn-item[data-target]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-target') === target);
    });

    // Auto refresh logs if tab changed to logs
    if (target === 'logs') {
        fetchLogs();
    }
    // Auto refresh admin logs if admin panel opened
    if (target === 'admin') {
        fetchAdminLogs();
    }
    // Auto refresh dev feedback if inbox opened
    if (target === 'dev-feedback') {
        fetchDevFeedback();
    }
    // Init Live Monitor applet
    if (target === 'live-monitor' && typeof lwbInit === 'function') {
        lwbInit();
    }
};

// Handle browser back button - navigate within app instead of going to login
window.addEventListener('popstate', (e) => {
    // Remove the current entry from our stack
    if (_navHistory.length > 0) _navHistory.pop();

    // Go to previous section, defaulting to 'home' if nothing is left
    const previous = _navHistory.length > 0 ? _navHistory[_navHistory.length - 1] : 'home';

    _navIsPopping = true;
    openApp(previous);
    _navIsPopping = false;

    // ALWAYS re-push a state after handling so the cushion never runs out.
    // This means the user can never keep pressing back until they reach /login.
    history.pushState({ navTarget: previous }, '', window.location.pathname);
    if (_navHistory.length === 0) _navHistory.push('home');
});

function setupNavigation() {
    els.navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) openApp(target);
        });
    });
}

// ==========================================
// Mobile Sidebar
// ==========================================
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = els.sidebarOverlay;

    function openSidebar() {
        if (sidebar) sidebar.classList.add('sidebar-open');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
    }

    // Burger button toggles sidebar
    if (els.burgerBtn) {
        els.burgerBtn.addEventListener('click', () => {
            sidebar && sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
        });
    }
    // Overlay closes sidebar
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    // Close sidebar when any nav item is clicked on mobile
    document.querySelectorAll('.nav-item[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    // ── Quote Generator Preview Toggle (mobile) ──
    const previewBtn = document.createElement('button');
    previewBtn.className = 'preview-toggle-btn';
    previewBtn.id = 'preview-toggle-btn';
    previewBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        Preview`;
    document.body.appendChild(previewBtn);

    previewBtn.addEventListener('click', () => {
        const panel = document.getElementById('quote-preview-panel');
        const backdrop = document.getElementById('preview-sheet-backdrop');
        if (!panel) return;
        
        const isOpening = !panel.classList.contains('sheet-open');
        panel.classList.toggle('sheet-open', isOpening);
        if (backdrop) backdrop.classList.toggle('active', isOpening);
        previewBtn.classList.toggle('sheet-open', isOpening);
        document.body.classList.toggle('no-scroll', isOpening);
    });

    // Close bottom sheet
    function closePreviewSheet() {
        const panel = document.getElementById('quote-preview-panel');
        const backdrop = document.getElementById('preview-sheet-backdrop');
        if (panel) panel.classList.remove('sheet-open');
        if (backdrop) backdrop.classList.remove('active');
        previewBtn.classList.remove('sheet-open');
        document.body.classList.remove('no-scroll');
    }

    const backdrop = document.getElementById('preview-sheet-backdrop');
    if (backdrop) backdrop.addEventListener('click', closePreviewSheet);

    const closeBtn = document.getElementById('btn-close-preview-sheet');
    if (closeBtn) closeBtn.addEventListener('click', closePreviewSheet);

    // Only show preview toggle when on quotes tab
    function updatePreviewBtnVisibility() {
        const onMobile = window.innerWidth <= 768;
        const onQuotes = document.getElementById('quotes-applet')?.classList.contains('active') ||
                         !document.getElementById('quotes-applet')?.classList.contains('hidden');
        previewBtn.style.display = (onMobile && onQuotes) ? 'flex' : 'none';
    }
    window.addEventListener('resize', updatePreviewBtnVisibility);
    document.addEventListener('click', updatePreviewBtnVisibility);
    updatePreviewBtnVisibility();
}

// ==========================================
// Proxy Helper
// ==========================================
async function makeExotelRequest(endpointPath, method = 'GET', data = null, isFormEncoded = false) {
    const region = (document.getElementById('cfg-subdomain') || {}).value?.trim() || sessionStorage.getItem('exo_subdomain') || '';
    const sid    = (document.getElementById('cfg-sid')      || {}).value?.trim() || sessionStorage.getItem('exo_sid')       || '';
    const key    = (document.getElementById('cfg-key')      || {}).value?.trim() || sessionStorage.getItem('exo_key')       || '';
    const token  = (document.getElementById('cfg-token')    || {}).value?.trim() || sessionStorage.getItem('exo_token')     || '';

    if (!region || !sid || !key || !token) {
        window.openApiSettings('API credentials are required to proceed.');
        throw new Error('Missing Exotel Configuration (Region, SID, API Key, Token)');
    }

    // Determine Domain based on region and endpoint type
    let domain = '';
    const isUserApi = endpointPath.includes('/users') || endpointPath.includes('/users.json');

    if (region === 'singapore') {
        domain = isUserApi ? 'ccm-api.exotel.com' : 'api.exotel.com';
    } else {
        domain = isUserApi ? 'ccm-api.in.exotel.com' : 'api.in.exotel.com';
    }

    // Support absolute paths like /v2/accounts/... or fallback to /v1/Accounts/...
    let url = '';
    if (endpointPath.startsWith('/v2/') || endpointPath.startsWith('/v2_beta/')) {
        url = `https://${domain}${endpointPath.replace('{sid}', sid)}`;
    } else {
        url = `https://${domain}/v1/Accounts/${sid}${endpointPath}`;
    }

    // Create Basic Auth Header
    const authString = btoa(`${key}:${token}`);

    const payload = {
        url,
        method,
        data,
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': isFormEncoded ? 'application/x-www-form-urlencoded' : 'application/json'
        }
    };

    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({ error: 'Unknown Error' }));
            let errMsg = 'Unknown Proxy Error';
            if (result.error !== undefined) {
                const errBody = result.error;
                if (typeof errBody === 'string') {
                    errMsg = errBody || `Empty API Error Response (HTTP ${response.status})`;
                } else if (errBody && errBody.response && errBody.response.error_data) {
                    const errData = errBody.response.error_data;
                    errMsg = errData.description || errData.message || JSON.stringify(errData);
                } else if (errBody && errBody.RestException && errBody.RestException.Message) {
                    errMsg = errBody.RestException.Message;
                } else if (errBody && errBody.message) {
                    errMsg = errBody.message;
                } else if (errBody && errBody.error) {
                    errMsg = typeof errBody.error === 'string' ? errBody.error : JSON.stringify(errBody.error);
                } else if (errBody) {
                    errMsg = JSON.stringify(errBody);
                } else {
                    errMsg = `Empty API Error Response (HTTP ${response.status})`;
                }
            }
            if (errMsg === '""' || errMsg === '{}') errMsg = `Empty response from API (HTTP ${response.status} - Check credentials/endpoint)`;
            throw new Error(errMsg);
        }

        return await response.json();
    } catch (e) {
        if (e.message === 'Failed to fetch') {
            throw new Error('Connection failed: Ensure the dashboard server is running and accessible.');
        }
        throw e;
    }
}

// ==========================================
// Toast & Modal Notification System
// ==========================================
function showToast(message, type = 'error') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
        document.body.appendChild(container);
    }
    const colors = { error: '#ef4444', success: '#10b981', info: '#3b82f6', warning: '#f59e0b' };
    const icons  = { error: '✕', success: '✓', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:#1e293b; color:#f1f5f9; border-left:4px solid ${colors[type]||colors.error}; border-radius:8px; padding:12px 16px; font-size:0.875rem; font-family:Inter,sans-serif; max-width:360px; box-shadow:0 8px 24px rgba(0,0,0,0.3); pointer-events:all; display:flex; gap:10px; align-items:flex-start; animation:slideInRight 0.2s ease;`;
    toast.innerHTML = `<span style="color:${colors[type]||colors.error}; font-weight:700; font-size:1rem; flex-shrink:0;">${icons[type]||icons.error}</span><span style="flex:1;">${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1rem;padding:0;flex-shrink:0;">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}

// ==========================================
// In-House Modal Popup System
// Replaces browser alert() / confirm() / prompt()
// ==========================================
(function() {
    // Inject polished modal CSS
    if (!document.getElementById('isd-modal-style')) {
        const style = document.createElement('style');
        style.id = 'isd-modal-style';
        style.textContent = `
        @keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .isd-overlay {
            position:fixed; inset:0; z-index:199999;
            background:rgba(15,23,42,0.55);
            backdrop-filter:blur(4px);
            display:flex; align-items:center; justify-content:center;
            animation:isdFadeIn 0.15s ease;
        }
        .isd-overlay.closing { animation:isdFadeOut 0.15s ease forwards; }
        .isd-modal {
            background:#ffffff; border-radius:16px;
            padding:28px 28px 24px;
            max-width:420px; width:calc(100% - 40px);
            box-shadow:0 24px 60px -10px rgba(0,0,0,0.25),0 0 0 1px rgba(0,0,0,0.04);
            animation:isdSlideUp 0.18s cubic-bezier(0.34,1.56,0.64,1);
            font-family:'Inter',sans-serif;
        }
        .isd-overlay.closing .isd-modal { animation:isdSlideDown 0.15s ease forwards; }
        .isd-modal-icon {
            width:44px; height:44px; border-radius:12px;
            display:flex; align-items:center; justify-content:center;
            margin-bottom:14px; font-size:1.3rem;
        }
        .isd-modal-icon.info    { background:#eff6ff; color:#2563eb; }
        .isd-modal-icon.success { background:#f0fdf4; color:#16a34a; }
        .isd-modal-icon.warning { background:#fffbeb; color:#d97706; }
        .isd-modal-icon.error   { background:#fef2f2; color:#dc2626; }
        .isd-modal-icon.prompt  { background:#f0f9ff; color:#0284c7; }
        .isd-modal-icon.confirm { background:#fef3c7; color:#b45309; }
        .isd-modal-title { font-size:1.1rem; font-weight:700; color:#0f172a; margin:0 0 8px 0; }
        .isd-modal-message { font-size:0.92rem; color:#475569; line-height:1.55; margin:0 0 20px 0; }
        .isd-modal-input {
            width:100%; padding:10px 14px;
            border:1.5px solid #cbd5e1; border-radius:8px;
            font-size:0.95rem; font-family:'Inter',sans-serif; color:#0f172a;
            background:#f8fafc; margin-bottom:20px; box-sizing:border-box;
            outline:none; transition:border-color 0.15s;
        }
        .isd-modal-input:focus { border-color:#0284c7; background:#fff; }
        .isd-modal-actions { display:flex; gap:10px; justify-content:flex-end; }
        .isd-btn {
            padding:9px 20px; border-radius:8px; font-size:0.9rem;
            font-weight:600; cursor:pointer; border:none;
            font-family:'Inter',sans-serif; transition:all 0.15s;
        }
        .isd-btn-primary { background:#0284c7; color:#fff; }
        .isd-btn-primary:hover { background:#0369a1; transform:translateY(-1px); }
        .isd-btn-danger  { background:#ef4444; color:#fff; }
        .isd-btn-danger:hover  { background:#dc2626; transform:translateY(-1px); }
        .isd-btn-cancel  { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
        .isd-btn-cancel:hover  { background:#e2e8f0; }
        @keyframes isdFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes isdFadeOut  { from{opacity:1} to{opacity:0} }
        @keyframes isdSlideUp  { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes isdSlideDown{ from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(12px)} }
        `;
        document.head.appendChild(style);
    }

    function _closeOverlay(overlay, cb) {
        overlay.classList.add('closing');
        setTimeout(() => { overlay.remove(); if(cb) cb(); }, 150);
    }

    function _iconSvg(type) {
        const icons = {
            info:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            error:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            confirm: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            prompt:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        };
        return icons[type] || icons.info;
    }

    /**
     * showAlert(message, { title, type }) → Promise<void>
     * type: 'info' | 'success' | 'warning' | 'error'
     */
    window.showAlert = function(message, { title = '', type = 'info' } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'isd-overlay';
            overlay.innerHTML = `
                <div class="isd-modal" role="dialog" aria-modal="true">
                    <div class="isd-modal-icon ${type}">${_iconSvg(type)}</div>
                    ${title ? `<div class="isd-modal-title">${title}</div>` : ''}
                    <p class="isd-modal-message">${message}</p>
                    <div class="isd-modal-actions">
                        <button class="isd-btn isd-btn-primary" id="isd-ok">OK</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const btn = overlay.querySelector('#isd-ok');
            btn.focus();
            const close = () => _closeOverlay(overlay, resolve);
            btn.addEventListener('click', close);
            overlay.addEventListener('keydown', e => { if(e.key==='Enter'||e.key==='Escape') close(); });
        });
    };

    /**
     * showConfirm(message, { title, type, confirmText, cancelText, danger }) → Promise<boolean>
     */
    window.showConfirm = function(message, { title = 'Confirm', type = 'confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'isd-overlay';
            const btnClass = danger ? 'isd-btn-danger' : 'isd-btn-primary';
            overlay.innerHTML = `
                <div class="isd-modal" role="dialog" aria-modal="true">
                    <div class="isd-modal-icon ${type}">${_iconSvg(type)}</div>
                    ${title ? `<div class="isd-modal-title">${title}</div>` : ''}
                    <p class="isd-modal-message">${message}</p>
                    <div class="isd-modal-actions">
                        <button class="isd-btn isd-btn-cancel" id="isd-cancel">${cancelText}</button>
                        <button class="isd-btn ${btnClass}" id="isd-confirm">${confirmText}</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const btnConfirm = overlay.querySelector('#isd-confirm');
            const btnCancel  = overlay.querySelector('#isd-cancel');
            btnCancel.focus();
            btnConfirm.addEventListener('click', () => _closeOverlay(overlay, () => resolve(true)));
            btnCancel.addEventListener('click',  () => _closeOverlay(overlay, () => resolve(false)));
            overlay.addEventListener('keydown', e => {
                if(e.key==='Escape') _closeOverlay(overlay, () => resolve(false));
                if(e.key==='Enter')  _closeOverlay(overlay, () => resolve(true));
            });
        });
    };

    /**
     * showPrompt(message, defaultValue, { title }) → Promise<string|null>
     * Returns null if cancelled.
     */
    window.showPrompt = function(message, defaultValue = '', { title = '' } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'isd-overlay';
            overlay.innerHTML = `
                <div class="isd-modal" role="dialog" aria-modal="true">
                    <div class="isd-modal-icon prompt">${_iconSvg('prompt')}</div>
                    ${title ? `<div class="isd-modal-title">${title}</div>` : ''}
                    <p class="isd-modal-message">${message}</p>
                    <input class="isd-modal-input" id="isd-prompt-input" type="text" value="" autocomplete="off">
                    <div class="isd-modal-actions">
                        <button class="isd-btn isd-btn-cancel" id="isd-cancel">Cancel</button>
                        <button class="isd-btn isd-btn-primary" id="isd-ok">OK</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const input     = overlay.querySelector('#isd-prompt-input');
            const btnOk     = overlay.querySelector('#isd-ok');
            const btnCancel = overlay.querySelector('#isd-cancel');
            input.value = defaultValue;
            input.focus();
            input.select();
            const submit = () => _closeOverlay(overlay, () => resolve(input.value));
            const cancel = () => _closeOverlay(overlay, () => resolve(null));
            btnOk.addEventListener('click', submit);
            btnCancel.addEventListener('click', cancel);
            input.addEventListener('keydown', e => { if(e.key==='Enter') submit(); if(e.key==='Escape') cancel(); });
        });
    };
})();

// ==========================================
// Click Sound Engine (Web Audio API)
// ==========================================
(function() {
    let _ctx = null;
    function _getCtx() {
        if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
        return _ctx;
    }
    function playClickSound(type = 'default') {
        try {
            const ctx = _getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;
            if (type === 'danger') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(660, now);
                osc.frequency.setValueAtTime(880, now + 0.06);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            }
        } catch(e) { /* audio unavailable */ }
    }
    window.playClickSound = playClickSound;
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button, .btn, .nav-item, .app-card, .use-case-card, .auth-btn, [role="button"]');
        if (!target) return;
        const isDanger  = target.classList.contains('btn-reset') || target.classList.contains('btn-danger') ||
                          target.classList.contains('isd-btn-danger') ||
                          /delete|reset/i.test(target.textContent);
        const isSuccess = target.classList.contains('btn-primary') ||
                          target.id === 'isd-confirm' || target.id === 'isd-ok';
        if (isDanger) playClickSound('danger');
        else if (isSuccess) playClickSound('success');
        else playClickSound('default');
    }, { passive: true });
})();

// ==========================================
// Terminal Logger
// ==========================================
function sanitizeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function logTerminal(message, type = 'info') {
    // Silently log to the terminal output - bar stays hidden (logs visible in Activity Logs tab)
    if (!els.terminalOutput) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    const time = new Date().toLocaleTimeString();
    line.innerHTML = `<span style="color:#555">[${time}]</span> ${sanitizeHTML(message)}`;
    els.terminalOutput.appendChild(line);
    els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight;
}

// ==========================================
// 🚧 Under-Construction Guard
// ==========================================
function _wip(featureName) {
    showAlert(
        `<strong>${featureName || 'This feature'}</strong> is currently <strong>under construction</strong> and will be available in a future update.<br><br>` +
        `<span style="font-size:0.85em;color:#64748b;">The UI is live and fully functional — the backend integration for this section is still being wired up. Stay tuned! 🚀</span>`,
        { title: '🚧 Under Construction', type: 'warning' }
    );
}

// ==========================================
// Users Applet Logic
// ==========================================
function setupUsersApplet() {
    // CSV file input change handler
    els.csvFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('csv-filename-label').textContent = `✓ ${file.name}`;
            handleUserCsvUpload(file);
        }
    });

    els.btnProcessUsers.addEventListener('click', processSelectedUsers);

    // Download Sample CSV
    els.downloadSampleCsv.addEventListener('click', (e) => {
        e.preventDefault();
        const sampleHeaders = ["first_name", "last_name", "email", "device_contact_uri"];
        const sampleRows = [
            ["Jane", "Doe", "jane@company.com", "+1234567890"],
            ["John", "Smith", "john@company.com", "+0987654321"]
        ];

        let csvContent = "data:text/csv;charset=utf-8,"
            + sampleHeaders.join(",") + "\n"
            + sampleRows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "exotel_users_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Quick Verify logic
    els.btnQuickVerify.addEventListener('click', async () => {
        _wip('Single Number Verification'); return; // 🚧 Under Construction
        const fromNum = els.quickVerifyFrom.value.trim();

        if (!fromNum) {
            showAlert("Please enter a Phone Number to verify.", { type: 'warning', title: 'Missing Input' });
            return;
        }

        els.btnQuickVerify.disabled = true;
        els.quickVerifyResult.innerHTML = `<span style="color:var(--warning);">Verifying...</span>`;
        logTerminal(`[Standalone Verify] Triggering verification for ${fromNum}...`, 'info');

        try {
            const url = `https://my.exotel.in/exoapi/updateDevice?From=${encodeURIComponent(fromNum)}`;
            await fetch(url, { mode: 'no-cors', credentials: 'include' });
            logTerminal(`[Standalone Verify] Request sent for ${fromNum}`, 'success');
            els.quickVerifyResult.innerHTML = `<span style="color:var(--success);">✓ Request Sent for ${fromNum}</span>`;
        } catch (e) {
            logTerminal(`[Standalone Verify] Failed for ${fromNum}: ${e.message}`, 'error');
            els.quickVerifyResult.innerHTML = `<span style="color:var(--danger);">Failed: ${e.message}</span>`;
        }

        els.btnQuickVerify.disabled = false;
    });

    els.selectAllUsers.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => {
            if (!cb.disabled) cb.checked = e.target.checked;
        });
    });

    // Batch verify CSV setup
    const verifyCsvFile = document.getElementById('verify-csv-file');
    if (verifyCsvFile) {
        verifyCsvFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) window.handleVerifyCsvDrop(file);
        });
    }
    const btnVerifyBatch = document.getElementById('btn-verify-batch');
    if (btnVerifyBatch) btnVerifyBatch.addEventListener('click', () => { _wip('Batch Number Verification'); }); // 🚧 Under Construction
}

// Global drag-drop handler for Add Users CSV
window.handleDroppedCsv = function(file) {
    if (!file || !file.name.endsWith('.csv')) {
        showAlert('Please drop a valid .csv file.', { type: 'warning', title: 'Invalid File' });
        return;
    }
    document.getElementById('csv-filename-label').textContent = `✓ ${file.name}`;
    handleUserCsvUpload(file);
};

function handleUserCsvUpload(fileOrEvent) {
    // A file object will have .name and .size. An event will have .target.files.
    let file = null;
    if (fileOrEvent && fileOrEvent.name && fileOrEvent.size !== undefined) {
        file = fileOrEvent;
    } else if (fileOrEvent && fileOrEvent.target && fileOrEvent.target.files) {
        file = fileOrEvent.target.files[0];
    }
    
    if (!file) return;

    logTerminal(`Parsing CSV: ${file.name}`, 'info');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            try {
                logTerminal(`CSV Parsed: ${results.data.length} rows found`, 'success');
                prepareUsersForPreview(results.data);
                if (els.csvFile) els.csvFile.value = '';
            } catch (err) {
                showToast('Error processing CSV: ' + err.message, 'error');
                logTerminal('CSV processing error: ' + err.message, 'error');
            }
        },
        error: function (err) {
            logTerminal(`CSV Parse Error: ${err.message}`, 'error');
            showToast('Could not parse CSV: ' + err.message, 'error');
            if (els.csvFile) els.csvFile.value = '';
        }
    });

    // Input value is reset by the caller after parsing
}

async function prepareUsersForPreview(data) {
    // No longer fetching existing users as v2 API does not support fetching all users
    let existingEmails = new Set();
    let existingPhones = new Set();

    parsedUsers = data.map((row, index) => {
        const getVal = (r, possibleKeys) => {
            for (let k of Object.keys(r)) {
                if (possibleKeys.includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) return r[k];
            }
            return '';
        };

        let firstName = getVal(row, ['firstname', 'first', 'fname']);
        let lastName = getVal(row, ['lastname', 'last', 'lname']);
        let email = getVal(row, ['email', 'emailaddress']);
        let phone = getVal(row, ['phone', 'phonenumber', 'mobile', 'cell', 'contact', 'devicecontacturi']);

        // Format to E.164 if missing
        if (phone && phone.length === 10 && !phone.startsWith('+')) {
            phone = '+91' + phone;
        }

        if (lastName.length > 0 && lastName.length < 3) {
            const lastChar = lastName.charAt(lastName.length - 1);
            while (lastName.length < 3) {
                lastName += lastChar;
            }
        } else if (lastName.length === 0) {
            lastName = 'XXX';
        }

        let isDuplicate = false;
        if (email && existingEmails.has(email.toLowerCase())) isDuplicate = true;
        if (phone && existingPhones.has(phone.replace(/[^0-9]/g, ''))) isDuplicate = true;

        return {
            id: index,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Phone: phone,
            isDuplicate: isDuplicate,
            status: isDuplicate ? 'skip' : 'pending'
        };
    });

    renderUsersPreview();
}

function renderUsersPreview() {
    try {
        els.usersTableBody.innerHTML = '';
        els.previewCount.textContent = parsedUsers.length;

        parsedUsers.forEach(user => {
            const tr = document.createElement('tr');
            const badgeClass = user.status === 'skip' ? 'status-skip' : 'status-pending';
            const badgeText = user.status === 'skip' ? 'Duplicate (Skip)' : 'Pending';
            const disabledAttr = user.status === 'skip' ? 'disabled' : 'checked';

            tr.innerHTML = `
                <td><input type="checkbox" class="user-checkbox" data-id="${user.id}" ${disabledAttr}></td>
                <td>${user.FirstName}</td>
                <td><strong>${user.LastName}</strong></td>
                <td>${user.Email}</td>
                <td>${user.Phone}</td>
                <td id="status-cell-${user.id}"><span class="status-badge ${badgeClass}">${badgeText}</span></td>
            `;
            els.usersTableBody.appendChild(tr);
        });

        els.usersPreview.classList.remove('hidden');
    } catch(err) {
        showToast('Error rendering preview: ' + err.message, 'error');
        logTerminal('renderUsersPreview error: ' + err.message, 'error');
    }
}

async function processSelectedUsers() {
    _wip('Sync Users'); return; // 🚧 Under Construction
    if (isProcessing) return;

    // Additional safeguard before making batch POST requests
    const region = (document.getElementById('cfg-subdomain') || {}).value?.trim() || sessionStorage.getItem('exo_subdomain') || '';
    const sid    = (document.getElementById('cfg-sid')      || {}).value?.trim() || sessionStorage.getItem('exo_sid')       || '';
    const key    = (document.getElementById('cfg-key')      || {}).value?.trim() || sessionStorage.getItem('exo_key')       || '';
    const token  = (document.getElementById('cfg-token')    || {}).value?.trim() || sessionStorage.getItem('exo_token')     || '';

    if (!region || !sid || !key || !token) {
        window.openApiSettings('API credentials required to sync users.');
        logTerminal('Batch Creation Aborted: Exotel Configuration Missing.', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkboxes.length === 0) {
        showAlert("Please select at least one user to process.", { type: 'warning', title: 'Nothing Selected' });
        return;
    }

    isProcessing = true;
    els.btnProcessUsers.disabled = true;
    logTerminal(`Starting batch creation for ${checkboxes.length} users...`, 'info');

    for (const checkbox of checkboxes) {
        const userId = parseInt(checkbox.getAttribute('data-id'));
        const user = parsedUsers.find(u => u.id === userId);
        const stCell = document.getElementById(`status-cell-${userId}`);

        try {
            logTerminal(`[User ${userId}] Creating user ${user.FirstName} ${user.LastName}...`, 'info');

            const payload = {
                first_name: user.FirstName,
                last_name: user.LastName,
                email: user.Email || undefined,
                device_contact_uri: user.Phone || undefined
            };

            // Remove undefined fields
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            await makeExotelRequest('/v2/accounts/{sid}/users', 'POST', payload);

            logTerminal(`[User ${userId}] Success!`, 'success');
            stCell.innerHTML = `<span class="status-badge status-success">Success</span>`;
            checkbox.checked = false;
            checkbox.disabled = true;
        } catch (error) {
            logTerminal(`[User ${userId}] Failed: ${error.message}`, 'error');
            stCell.innerHTML = `<span class="status-badge status-error">Failed</span>`;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    isProcessing = false;
    els.btnProcessUsers.disabled = false;
    logTerminal(`Batch process complete.`, 'success');
    fetchLogs();
}

async function verifyUserDevice(userId) {
    const user = parsedUsers.find(u => u.id === parseInt(userId));
    if (!user || user.status === 'skip' || !user.Phone) return false;

    const verifyCell = document.getElementById(`verify-cell-${userId}`);
    verifyCell.innerHTML = `<span class="status-badge status-pending">Verifying...</span>`;

    try {
        logTerminal(`[Verify] Triggering verification for ${user.Phone}...`, 'info');
        const url = `https://my.exotel.in/exoapi/updateDevice?From=${encodeURIComponent(user.Phone)}`;

        // Bypass proxy and send directly from browser to use local Exotel session cookie
        await fetch(url, { mode: 'no-cors', credentials: 'include' });

        logTerminal(`[Verify] Request sent for ${user.Phone}`, 'success');
        verifyCell.innerHTML = `<span class="status-badge status-success">Sent</span>`;
        return true;
    } catch (e) {
        logTerminal(`[Verify] Failed for ${user.Phone}: ${e.message}`, 'error');
        verifyCell.innerHTML = `<span class="status-badge status-error">Failed</span>`;
        return false;
    }
}

// Attach verify listeners once UI is updated
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-verify-single')) {
        const userId = e.target.getAttribute('data-id');
        e.target.disabled = true;
        await verifyUserDevice(userId);
    }
});




// ==========================================
// Batch Verify Logic (Verify Users applet)
// ==========================================
let verifyBatchNumbers = [];

window.handleVerifyCsvDrop = function(file) {
    if (!file || !file.name.endsWith('.csv')) {
        showAlert('Please provide a valid .csv file.', { type: 'warning', title: 'Invalid File' });
        return;
    }
    document.getElementById('verify-csv-filename').textContent = `✓ ${file.name}`;
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const getPhone = (row) => {
                for (let k of Object.keys(row)) {
                    if (['phone', 'phonenumber', 'mobile', 'contact', 'devicecontacturi', 'number'].includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                        return row[k];
                    }
                }
                return null;
            };
            verifyBatchNumbers = results.data
                .map(row => {
                    let phone = getPhone(row);
                    if (phone && phone.length === 10 && !phone.startsWith('+')) phone = '+91' + phone;
                    return phone;
                })
                .filter(Boolean);

            document.getElementById('verify-batch-count').textContent = verifyBatchNumbers.length;
            const tbody = document.getElementById('verify-batch-table-body');
            tbody.innerHTML = verifyBatchNumbers.map((p, i) =>
                `<tr><td>${i + 1}</td><td style="font-family:monospace;">${p}</td><td id="vbatch-status-${i}"><span class="status-badge status-pending">Pending</span></td></tr>`
            ).join('');
            document.getElementById('verify-batch-preview').classList.remove('hidden');
            logTerminal(`[Batch Verify] Loaded ${verifyBatchNumbers.length} numbers from CSV.`, 'info');
            const verifyCsvFile = document.getElementById('verify-csv-file');
            if (verifyCsvFile) verifyCsvFile.value = '';
        },
        error: function(err) {
            showAlert('Error parsing CSV: ' + err.message, { type: 'error', title: 'Parse Error' });
            const verifyCsvFile = document.getElementById('verify-csv-file');
            if (verifyCsvFile) verifyCsvFile.value = '';
        }
    });
};

async function runBatchVerification() {
    if (verifyBatchNumbers.length === 0) {
        showAlert('No numbers loaded. Please upload a CSV first.', { type: 'warning', title: 'No Data' });
        return;
    }
    const btn = document.getElementById('btn-verify-batch');
    btn.disabled = true;
    logTerminal(`[Batch Verify] Starting verification for ${verifyBatchNumbers.length} numbers...`, 'info');

    for (let i = 0; i < verifyBatchNumbers.length; i++) {
        const phone = verifyBatchNumbers[i];
        const statusCell = document.getElementById(`vbatch-status-${i}`);
        statusCell.innerHTML = `<span class="status-badge status-pending">Verifying...</span>`;
        try {
            const url = `https://my.exotel.in/exoapi/updateDevice?From=${encodeURIComponent(phone)}`;
            await fetch(url, { mode: 'no-cors', credentials: 'include' });
            statusCell.innerHTML = `<span class="status-badge status-success">✓ Sent</span>`;
            logTerminal(`[Batch Verify] Sent for ${phone}`, 'success');
        } catch(e) {
            statusCell.innerHTML = `<span class="status-badge status-error">Failed</span>`;
            logTerminal(`[Batch Verify] Failed for ${phone}: ${e.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 600));
    }

    btn.disabled = false;
    logTerminal(`[Batch Verify] Complete.`, 'success');
};

// ==========================================
// Exophones Applet Logic
// ==========================================
function setupExophonesApplet() {
    els.btnFetchExo.addEventListener('click', () => { _wip('Fetch Available Numbers'); }); // 🚧 Under Construction
    els.btnDownloadExo.addEventListener('click', downloadExophonesCsv);
    els.btnAllocateExo.addEventListener('click', () => { _wip('Allocate Exophones'); }); // 🚧 Under Construction
}

async function fetchExophones() {
    const country = document.getElementById('exo-country').value.trim().toUpperCase() || 'IN';
    const type = document.getElementById('exo-type').value;
    const region = document.getElementById('exo-region').value.trim().toUpperCase();
    const contains = document.getElementById('exo-contains').value.trim();
    const needsSms = document.getElementById('exo-sms').checked;

    try {
        els.btnFetchExo.disabled = true;
        logTerminal(`Fetching ${type} Exophones for ${country}...`, 'info');

        let queryParams = [];
        if (region) queryParams.push(`InRegion=${encodeURIComponent(region)}`);
        if (contains) queryParams.push(`Contains=${encodeURIComponent(contains)}`);
        if (needsSms) queryParams.push(`IncomingSMS=true`);

        let queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const endpoint = `/v2_beta/Accounts/{sid}/AvailablePhoneNumbers/${country}/${type}${queryString}`;

        const results = await makeExotelRequest(endpoint);

        if (Array.isArray(results)) {
            // Apply client-side filtering for SMS if API ignores the parameter
            let filteredResults = results;
            if (needsSms) {
                filteredResults = results.filter(num => num?.capabilities?.sms === true);
            }

            availableExophones = filteredResults; // Now storing objects, not just strings
            logTerminal(`Fetched ${availableExophones.length} exophones successfully.`, 'success');

            els.exoCount.textContent = availableExophones.length;
            els.exoList.innerHTML = '';

            if (availableExophones.length === 0) {
                els.exoList.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px;">No numbers available matching these criteria.</td></tr>`;
            } else {
                availableExophones.forEach(numObj => {
                    try {
                        const tr = document.createElement('tr');
                        const hasSms = numObj?.capabilities?.sms || false;
                        const hasVoice = numObj?.capabilities?.voice || false;

                        const smsBadge = hasSms ? '<span class="status-badge status-success">Yes</span>' : '<span class="status-badge status-skip">No</span>';
                        const voiceBadge = hasVoice ? '<span class="status-badge status-success">Yes</span>' : '<span class="status-badge status-skip">No</span>';

                        tr.innerHTML = `
                            <td style="font-weight:600;">${numObj?.friendly_name || '-'}</td>
                            <td style="font-family:monospace;">${numObj?.phone_number || '-'}</td>
                            <td>${numObj?.number_type || '-'}</td>
                            <td>${numObj?.region || '-'}</td>
                            <td>${smsBadge}</td>
                            <td>${voiceBadge}</td>
                            <td>${(numObj?.one_time_price > 0) ? '₹' + parseInt(numObj.one_time_price) : 'Free'}</td>
                            <td>${(numObj?.rental_price > 0) ? '₹' + parseInt(numObj.rental_price) + '/month' : 'Free'}</td>
                            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="allocateSingleExo('${numObj?.phone_number}')">Allocate</button></td>
                        `;
                        els.exoList.appendChild(tr);
                    } catch (e) {
                        console.error("Error parsing a number object:", e, numObj);
                    }
                });
            }

            els.exoPreview.classList.remove('hidden');
        } else {
            logTerminal(`Unexpected API response format.`, 'warn');
        }
    } catch (error) {
        logTerminal(`Error fetching Exophones: ${error.message}`, 'error');
    } finally {
        els.btnFetchExo.disabled = false;
    }
}

function downloadExophonesCsv() {
    if (availableExophones.length === 0) return;

    const headers = ["Friendly_Name", "Phone_Number", "Type", "Region", "SMS", "Voice", "One_Time_Price", "Rental_Price"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    availableExophones.forEach(numObj => {
        const row = [
            numObj.friendly_name,
            numObj.phone_number,
            numObj.number_type,
            numObj.region,
            numObj.capabilities.sms,
            numObj.capabilities.voice,
            numObj.one_time_price,
            numObj.rental_price
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "available_exophones_v2.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


async function allocateExophones() {
    const count = parseInt(els.exoAllocateCount.value || 0);

    if (!count || count < 1) {
        showAlert("Enter a valid number of exophones to allocate", { type: 'warning', title: 'Invalid Input' });
        return;
    }

    if (availableExophones.length < count) {
        showAlert(`You requested to allocate ${count} numbers, but only ${availableExophones.length} are currently available. Please fetch numbers first or reduce the batch size.`, { type: 'warning', title: 'Not Enough Numbers' });
        return;
    }

    els.btnAllocateExo.disabled = true;

    let numbersToAllocate = availableExophones.slice(0, count).map(e => e.phone_number);


    if (numbersToAllocate.length === 0) {
        logTerminal(`No numbers to allocate.`, 'warn');
        els.btnAllocateExo.disabled = false;
        return;
    }

    logTerminal(`Starting allocation of ${numbersToAllocate.length} Exophones...`, 'info');

    for (let i = 0; i < numbersToAllocate.length; i++) {
        const numToAllocate = numbersToAllocate[i];
        logTerminal(`[Allocate ${i + 1}/${numbersToAllocate.length}] Reserving ${numToAllocate}...`, 'info');
        try {
            const formData = new URLSearchParams();
            formData.append('PhoneNumber', numToAllocate);
            await makeExotelRequest(`/v2_beta/Accounts/{sid}/IncomingPhoneNumbers`, 'POST', formData.toString(), true);
            logTerminal(`[Allocate ${i + 1}/${numbersToAllocate.length}] ${numToAllocate} Allocated successfully!`, 'success');
        } catch (error) {
            logTerminal(`[Allocate ${i + 1}/${numbersToAllocate.length}] Failed for ${numToAllocate}: ${error.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 600));
    }

    els.btnAllocateExo.disabled = false;
    logTerminal(`Allocation process complete.`, 'success');
    showAlert(`Allocation process complete. Check Logs for details.`, { type: 'success', title: 'Done!' });
    fetchLogs();
    fetchExophones();
}

async function allocateSingleExo(phoneNumber) {
    _wip('Allocate Exophone'); return; // 🚧 Under Construction
    if (!await showConfirm(`Are you sure you want to allocate ${phoneNumber} to your account?`, { title: 'Confirm Allocation', confirmText: 'Allocate' })) return;

    logTerminal(`Requesting allocation for ${phoneNumber}...`, 'info');
    try {
        const formData = new URLSearchParams();
        formData.append('PhoneNumber', phoneNumber);
        await makeExotelRequest(`/v2_beta/Accounts/{sid}/IncomingPhoneNumbers`, 'POST', formData.toString(), true);
        logTerminal(`${phoneNumber} Allocated successfully!`, 'success');
        showAlert(`Success! Number ${phoneNumber} has been allocated to your account.`, { type: 'success', title: 'Allocated!' });
        fetchLogs();
        fetchExophones(); // Refresh the list
    } catch (error) {
        logTerminal(`Failed to allocate ${phoneNumber}: ${error.message}`, 'error');
        showAlert(`Failed to allocate: ${error.message}`, { type: 'error', title: 'Allocation Failed' });
    }
}

// ==========================================
// Logs Applet Logic (Batch 3)
// ==========================================

// Store start of today for fetching today's logs
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const TODAY_START = todayStart.toISOString();

let _currentLogTab = 'activity';
let _currentAdminLogTab = 'activity';

window.switchLogTab = function(tab) {
    _currentLogTab = tab;
    document.querySelectorAll('#ltab-activity, #ltab-quotes').forEach(b => b.classList.remove('active'));
    document.getElementById(`ltab-${tab}`)?.classList.add('active');
    document.getElementById('log-activity-panel').classList.toggle('hidden', tab !== 'activity');
    document.getElementById('log-quotes-panel').classList.toggle('hidden', tab !== 'quotes');
};

window.switchAdminLogTab = function(tab) {
    _currentAdminLogTab = tab;
    document.querySelectorAll('#altab-activity, #altab-quotes').forEach(b => b.classList.remove('active'));
    document.getElementById(`altab-${tab}`)?.classList.add('active');
    document.getElementById('admin-log-activity-panel').classList.toggle('hidden', tab !== 'activity');
    document.getElementById('admin-log-quotes-panel').classList.toggle('hidden', tab !== 'quotes');
};

function setupLogsApplet() {
    document.getElementById('btn-refresh-logs')?.addEventListener('click', fetchLogs);
}

// Readable label map for action codes
const ACTION_LABELS = {
    LOGIN_ATTEMPT: 'Logged in',
    QUOTE_CREATED: 'Quote created',
    QUOTE_DELETED: 'Quote deleted',
    QUOTE_COUNTER_RESET: 'Quote counter reset',
    SKU_REQUEST: 'New SKU requested',
    STOP_LOCK_OVERRIDE: 'Manager approval requested',
    APPROVAL_GRANTED: 'Approval granted',
};

function formatActionLabel(action) {
    return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function relativeTime(isoStr) {
    const d = new Date(isoStr), now = new Date();
    const ms = now - d;
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days === 1) return 'yesterday';
    return d.toLocaleDateString();
}

function buildLogCard(log, opts = {}) {
    const isQuoteAction = log.action?.startsWith('QUOTE_');
    const isApproval = log.action === 'STOP_LOCK_OVERRIDE' || log.action === 'APPROVAL_GRANTED';
    const isError = log.status === 'ERROR' || log.status === 'FAILED';
    const badgeClass = log.status === 'SUCCESS' ? 'lc-badge-success'
        : isError ? 'lc-badge-error' : 'lc-badge-info';
    const dotClass = log.status === 'SUCCESS' ? 'lc-dot-success'
        : isError ? 'lc-dot-error' : 'lc-dot-neutral';
    const label = formatActionLabel(log.action);
    const relTime = relativeTime(log.timestamp);
    const absTime = new Date(log.timestamp).toLocaleString();

    // Parse quote number from details for clickable card
    let quoteNumber = null;
    const qMatch = (log.details || '').match(/Quote\s+([A-Z]{2,4}-\d{6}-\d{2})/i);
    if (qMatch) quoteNumber = qMatch[1];

    const isClickable = isQuoteAction && quoteNumber;
    const cardClass = `lc-card${isClickable ? ' lc-card-clickable' : ''}${isApproval ? ' lc-card-approval' : ''}`;
    const clickAttr = isClickable
        ? `onclick="navigateToQuote('${quoteNumber}', ${opts.isAdmin ? 'true' : 'false'})" title="Open quote ${quoteNumber}"`
        : '';

    return `
    <div class="${cardClass}" ${clickAttr}>
        <span class="lc-dot ${dotClass}"></span>
        <div class="lc-body">
            <div class="lc-top">
                <span class="lc-label">${sanitizeHTML(label)}</span>
                ${opts.userEmail ? `<span class="lc-user">${sanitizeHTML(opts.userEmail)}</span>` : ''}
                <span class="lc-badge ${badgeClass}">${log.status}</span>
                ${isClickable ? `<span class="lc-link-hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> View quote</span>` : ''}
            </div>
            ${log.details ? `<div class="lc-detail" title="${sanitizeHTML(absTime)}">${sanitizeHTML(log.details)}</div>` : ''}
        </div>
        <span class="lc-time" title="${sanitizeHTML(absTime)}">${sanitizeHTML(relTime)}</span>
    </div>`;
}

function renderGroupedLogs(logs, containerEl, opts = {}) {
    if (!logs || !logs.length) {
        containerEl.innerHTML = `<div class="lc-empty">No activity found.</div>`;
        return;
    }

    const groups = {};
    logs.forEach(l => {
        let cat = 'System Activity';
        const action = l.action.toUpperCase();
        if (action.includes('LOGIN') || action.includes('LOGOUT')) cat = 'Authentication';
        else if (action.includes('QUOTE') || action.includes('APPROVAL_') || action.includes('STOP_LOCK_OVERRIDE')) cat = 'Quotes & Approvals';
        else if (action.includes('SKU')) cat = 'SKU Management';
        else if (action.includes('USER') || action.includes('PROFILE')) cat = 'User Management';
        else if (action.includes('LWB') || action.includes('PROXY')) cat = 'API Integrations';
        
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(l);
    });

    const icons = {
        'Authentication': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        'Quotes & Approvals': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        'SKU Management': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
        'User Management': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        'API Integrations': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
        'System Activity': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
    };

    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">';
    Object.keys(groups).sort().forEach(cat => {
        html += `
        <div class="log-group-card">
            <div class="log-group-header">
                ${icons[cat] || icons['System Activity']} 
                <h3>${sanitizeHTML(cat)}</h3>
                <span class="log-count-badge">${groups[cat].length}</span>
            </div>
            <div class="log-group-list">
                ${groups[cat].map(l => buildLogCard(l, opts)).join('')}
            </div>
        </div>`;
    });
    html += '</div>';

    containerEl.innerHTML = html;
}

window.navigateToQuote = function(quoteNumber, isAdminView) {
    // Open Quote Generator → My Quotes tab and highlight the quote
    openApp('quotes');
    // Give the applet a moment to become visible
    setTimeout(() => {
        const tabBtn = isAdminView
            ? document.querySelector('[data-qtab="all-quotes"]') || document.querySelector('[onclick*="all-quotes"]')
            : document.querySelector('[data-qtab="my-quotes"]') || document.querySelector('[onclick*="my-quotes"]');
        if (tabBtn) tabBtn.click();
        // After quotes load, scroll to matching row
        setTimeout(() => {
            const rows = document.querySelectorAll('.quote-list-number');
            rows.forEach(el => {
                if (el.textContent.trim() === quoteNumber) {
                    el.closest('.quote-list-item')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.closest('.quote-list-item')?.classList.add('highlight-pulse');
                    setTimeout(() => el.closest('.quote-list-item')?.classList.remove('highlight-pulse'), 2000);
                }
            });
        }, 600);
    }, 200);
};

async function fetchLogs() {
    const activityEl = document.getElementById('logs-timeline');
    const quotesEl = document.getElementById('logs-quotes-list');
    if (!activityEl) return;

    const loadingHTML = `<div class="lc-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><p>Loading…</p></div>`;
    activityEl.innerHTML = loadingHTML;
    if (quotesEl) quotesEl.innerHTML = loadingHTML;

    try {
        const url = `/api/logs?since=${encodeURIComponent(TODAY_START)}`;
        const res = await fetch(url);
        const logs = await res.json();

        // Separate: hide STOP_LOCK_OVERRIDE from activity, put QUOTE_* in quotes tab
        const HIDDEN_ACTIONS = ['STOP_LOCK_OVERRIDE', 'LOGIN_ATTEMPT'];
        const activityLogs = logs.filter(l => !l.action?.startsWith('QUOTE_') && !HIDDEN_ACTIONS.includes(l.action));
        const quoteLogs    = logs.filter(l => l.action?.startsWith('QUOTE_'));

        const emptyHTML = (msg) => `<div class="lc-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></ polyline></svg><p>${msg}</p></div>`;

        if (activityEl) {
            if (activityLogs.length) renderGroupedLogs(activityLogs, activityEl);
            else activityEl.innerHTML = emptyHTML('No activity today yet.');
        }

        if (quotesEl) {
            if (quoteLogs.length) renderGroupedLogs(quoteLogs, quotesEl);
            else quotesEl.innerHTML = emptyHTML('No quote actions today.');
        }
    } catch (e) {
        activityEl.innerHTML = `<div class="lc-empty" style="color:var(--danger);">Failed to load logs: ${sanitizeHTML(e.message)}</div>`;
    }
}

// ==========================================
// Admin Panel Logic (Batch 3)
// ==========================================
let allAdminLogs = [];

function setupAdminPanel() {
    document.getElementById('btn-refresh-admin-logs')?.addEventListener('click', fetchAdminLogs);
    // Live search + filters - all re-render client-side after initial fetch
    ['admin-log-search', 'admin-log-user-filter', 'admin-log-status-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderAdminLogs);
        document.getElementById(id)?.addEventListener('change', renderAdminLogs);
    });
    // Date pickers re-fetch from server (server-side filtering)
    document.getElementById('admin-log-from')?.addEventListener('change', fetchAdminLogs);
    document.getElementById('admin-log-to')?.addEventListener('change', fetchAdminLogs);

    // ── Reset DB button ───────────────────────────────────────────────────────
    document.getElementById('btn-reset-db')?.addEventListener('click', async () => {
        // Step 1: primary warning confirm
        const step1 = await showConfirm(
            'This will permanently erase <strong>all</strong> quotes, drafts, logs, SKUs, approval requests, user profiles, and feedback from the database.<br><br>This action <strong>cannot be undone</strong>.',
            { title: '⚠️ Reset Entire Database?', type: 'warning', confirmText: 'Yes, continue', cancelText: 'Cancel', danger: true }
        );
        if (!step1) return;

        // Step 2: final typed-confirmation guard
        const typed = await showPrompt(
            'Type <strong>RESET</strong> in all-caps to confirm you want to permanently wipe all data.',
            '',
            { title: 'Final Confirmation Required' }
        );
        if (typed === null) return; // cancelled
        if (typed.trim() !== 'RESET') {
            showAlert('Confirmation text did not match. Database reset cancelled.', { type: 'info', title: 'Cancelled' });
            return;
        }

        // Disable button during request
        const btn = document.getElementById('btn-reset-db');
        if (btn) { btn.disabled = true; btn.textContent = 'Resetting…'; }

        try {
            const res = await fetch('/api/admin/reset-db', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
                playClickSound('danger');
                await showAlert(
                    'The database has been fully reset. All data has been erased. The page will now reload.',
                    { type: 'success', title: 'Database Reset Complete' }
                );
                window.location.reload();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (e) {
            showAlert('Reset failed: ' + e.message, { type: 'error', title: 'Reset Failed' });
            if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Reset Database`; }
        }
    });
}

async function fetchAdminLogs() {
    const from = document.getElementById('admin-log-from')?.value || '';
    const to   = document.getElementById('admin-log-to')?.value || '';
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);

    try {
        const res = await fetch(`/api/admin/logs?${params}`);
        if (!res.ok) { console.error('Admin logs fetch failed'); return; }
        allAdminLogs = await res.json();

        // Populate user filter dropdown
        const userEl = document.getElementById('admin-log-user-filter');
        if (userEl) {
            const users = [...new Set(allAdminLogs.map(l => l.user_email).filter(Boolean))].sort();
            const current = userEl.value;
            userEl.innerHTML = '<option value="">All Users</option>' +
                users.map(u => `<option value="${sanitizeHTML(u)}"${u === current ? ' selected' : ''}>${sanitizeHTML(u)}</option>`).join('');
        }
        renderAdminLogs();
    } catch (e) {
        console.error('Failed to fetch admin logs', e);
    }
}

function renderAdminLogs() {
    const activityEl = document.getElementById('admin-logs-timeline');
    const quotesEl   = document.getElementById('admin-logs-quotes-list');
    if (!activityEl) return;

    const search = (document.getElementById('admin-log-search')?.value || '').toLowerCase();
    const userFilter   = document.getElementById('admin-log-user-filter')?.value || '';
    const statusFilter = document.getElementById('admin-log-status-filter')?.value || '';
    const HIDDEN_ACTIONS = ['LOGIN_ATTEMPT'];

    const filtered = allAdminLogs.filter(l => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (userFilter  && l.user_email !== userFilter) return false;
        if (search) {
            const hay = `${l.user_email} ${l.action} ${l.details} ${l.status}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const activityLogs = filtered.filter(l => !l.action?.startsWith('QUOTE_'));
    const quoteLogs    = filtered.filter(l =>  l.action?.startsWith('QUOTE_'));

    const emptyHTML = (msg) => `<div class="lc-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><p>${msg}</p></div>`;

    if (activityEl) {
        if (activityLogs.length) renderGroupedLogs(activityLogs, activityEl, { isAdmin: true, userEmail: true });
        else activityEl.innerHTML = emptyHTML('No activity logs match the current filters.');
    }

    if (quotesEl) {
        if (quoteLogs.length) renderGroupedLogs(quoteLogs, quotesEl, { isAdmin: true, userEmail: true });
        else quotesEl.innerHTML = emptyHTML('No quote logs match the current filters.');
    }
}

// ==========================================
// Feedback System
// ==========================================
function setupFeedbackSystem() {
    const modal = document.getElementById('feedback-modal');
    const btnOpen = document.getElementById('btn-open-feedback');
    const btnClose = document.getElementById('btn-close-feedback-modal');
    const btnCancel = document.getElementById('btn-cancel-feedback');
    const btnSubmit = document.getElementById('btn-submit-feedback');
    const textarea = document.getElementById('feedback-message');

    if (!modal) return;

    const openModal = () => {
        modal.classList.remove('hidden');
        textarea.value = '';
        textarea.focus();
    };
    const closeModal = () => modal.classList.add('hidden');

    btnOpen?.addEventListener('click', openModal);
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    btnSubmit?.addEventListener('click', async () => {
        const message = textarea.value.trim();
        if (!message) {
            showAlert('Please enter a message before sending.', { type: 'warning', title: 'Empty Message' });
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Sending...';

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (res.ok) {
                showAlert('Your feedback has been sent to the developer. Thank you!', { type: 'success', title: 'Feedback Sent!' });
                closeModal();
            } else {
                throw new Error('Failed to send feedback');
            }
        } catch (e) {
            showAlert('Error: ' + e.message, { type: 'error', title: 'Send Failed' });
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Send Feedback';
        }
    });
}

function setupDevFeedbackApplet() {
    document.getElementById('btn-refresh-dev-feedback')?.addEventListener('click', fetchDevFeedback);
}

async function fetchDevFeedback() {
    const container = document.getElementById('dev-feedback-cards');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><br>Loading feedback…</div>`;

    try {
        const res = await fetch('/api/admin/dev-feedback');
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();

        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 40px; background:#fff; border-radius:12px; border:1px dashed #cbd5e1;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <p style="font-weight:600; color:#94a3b8; font-size:1rem;">Inbox is empty</p>
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-top:4px;">No feedback has been submitted yet.</p>
                </div>`;
            return;
        }

        data.forEach(item => {
            const date = new Date(item.created_at);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);
            let relTime = diffMins < 1 ? 'just now'
                : diffMins < 60 ? `${diffMins}m ago`
                : diffHrs < 24 ? `${diffHrs}h ago`
                : diffDays === 1 ? 'yesterday'
                : diffDays < 7 ? `${diffDays}d ago`
                : date.toLocaleDateString();

            const initial = (item.user_email || '?')[0].toUpperCase();
            const hue = [...(item.user_email || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

            const card = document.createElement('div');
            card.className = 'fb-card';
            card.innerHTML = `
                <div class="fb-card-avatar" style="background:hsl(${hue},60%,90%); color:hsl(${hue},60%,35%)">${initial}</div>
                <div class="fb-card-body">
                    <div class="fb-card-meta">
                        <span class="fb-card-email">${sanitizeHTML(item.user_email)}</span>
                        <span class="fb-card-time">${relTime}</span>
                    </div>
                    <p class="fb-card-message">${sanitizeHTML(item.message)}</p>
                </div>
                <button class="fb-card-delete btn-icon" onclick="deleteFeedback(${item.id})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--danger);">Error: ${sanitizeHTML(e.message)}</div>`;
    }
}

window.deleteFeedback = async function(id) {
    if (!await showConfirm('Are you sure you want to delete this feedback?', { title: 'Delete Feedback', confirmText: 'Delete', danger: true, type: 'warning' })) return;
    try {
        const res = await fetch(`/api/admin/dev-feedback/${id}/delete`, { method: 'POST' });
        if (res.ok) {
            fetchDevFeedback();
        } else {
            showAlert('Failed to delete feedback', { type: 'error', title: 'Error' });
        }
    } catch (e) {
        showAlert('Error: ' + e.message, { type: 'error', title: 'Error' });
    }
};

