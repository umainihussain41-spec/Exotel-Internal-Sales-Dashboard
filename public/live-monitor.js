// ── Live Call Monitor - Listen Only ──────────────────────────────────────────
const LWB = {
  pollTimer:    null,
  pollInterval: 3000,
  calls:        [],
  listening:    {},
  myPhone:      localStorage.getItem('lwb_my_phone') || '',
};

// ── Entry point ───────────────────────────────────────────────────────────────
function lwbInit() {
  lwbCheckCreds().then(ok => {
    const banner = document.getElementById('lwb-creds-banner');
    if (banner) banner.style.display = ok ? 'none' : 'flex';
    if (ok) {
      lwbRenderMyPhoneBar();
      lwbStartPolling();
    } else {
      lwbSetStatus('error', 'Exotel credentials not configured - check .env and restart server.');
    }
  });
}

// ── Persistent supervisor phone bar ───────────────────────────────────────────
function lwbRenderMyPhoneBar() {
  const container = document.getElementById('lwb-my-phone-bar');
  if (!container) return;
  container.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 14px;
    background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:14px;
    font-size:0.85rem;color:#15803d;`;
  container.innerHTML = `
    <span style="font-weight:600;white-space:nowrap;">📞 My phone (for listening):</span>
    <input id="lwb-my-phone-input" type="tel" value="${LWB.myPhone}"
      placeholder="+91XXXXXXXXXX"
      style="flex:1;padding:5px 10px;border:1px solid #86efac;border-radius:6px;
             font-size:0.85rem;outline:none;min-width:0;"
      oninput="LWB.myPhone=this.value.trim();localStorage.setItem('lwb_my_phone',this.value.trim());"
    />
    <span style="font-size:0.75rem;color:#166534;white-space:nowrap;">Set once, pre-fills all calls</span>`;
}

// ── Safe JSON fetch ───────────────────────────────────────────────────────────
async function lwbFetch(url, opts) {
  const r  = await fetch(url, opts);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const msg = r.status === 401
      ? 'Session expired - please refresh the page.'
      : `Server returned HTTP ${r.status}. Try restarting the server.`;
    throw new Error(msg);
  }
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// ── Credential check ──────────────────────────────────────────────────────────
async function lwbCheckCreds() {
  try {
    const { status } = await lwbFetch('/api/lwb/active-calls');
    return status !== 503;
  } catch { return false; }
}

// ── Polling ───────────────────────────────────────────────────────────────────
function lwbStartPolling() {
  lwbRefresh();
  clearInterval(LWB.pollTimer);
  LWB.pollTimer = setInterval(lwbRefresh, LWB.pollInterval);
}

function lwbStopPolling() {
  clearInterval(LWB.pollTimer);
  LWB.pollTimer = null;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-target]');
  if (btn && btn.getAttribute('data-target') !== 'live-monitor') lwbStopPolling();
});

// ── Fetch & render ────────────────────────────────────────────────────────────
async function lwbRefresh() {
  lwbSetStatus('refreshing', 'Refreshing…');
  try {
    const { ok, data } = await lwbFetch('/api/lwb/active-calls');
    if (!ok) {
      let msg = data?.error;
      if (msg && typeof msg === 'object') msg = msg.RestException?.Message || JSON.stringify(msg);
      lwbSetStatus('error', msg || 'Failed to fetch calls.');
      return;
    }
    LWB.calls = (data.calls || []).filter(c => !c.EndTime || c.EndTime === 'null' || c.EndTime === '');
    lwbRenderCalls(LWB.calls);
    lwbSetStatus('ok', LWB.calls.length === 0
      ? 'No live calls right now. Auto-refreshes every 3 s.'
      : `${LWB.calls.length} live call(s) in progress.`);
  } catch (e) {
    lwbSetStatus('error', e.message);
  }
}

// ── Render call cards ─────────────────────────────────────────────────────────
function lwbRenderCalls(calls) {
  const grid = document.getElementById('lwb-calls-grid');
  if (!grid) return;

  if (calls.length === 0) {
    grid.innerHTML = `
      <div class="lwb-empty">
        <div class="lwb-empty-icon">📵</div>
        <div>No live calls right now</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:4px;">Only active calls are shown · Auto-refreshes every 3 s</div>
      </div>`;
    return;
  }

  // A call is "active" if it has no EndTime
  const isActive = c => !c.EndTime || c.EndTime === 'null' || c.EndTime === '';

  const SC = {
    'in-progress': { bg:'#dcfce7', color:'#15803d', dot:'#22c55e' },
    'queued':      { bg:'#f0f9ff', color:'#0369a1', dot:'#38bdf8' },
    'ringing':     { bg:'#eff6ff', color:'#1d4ed8', dot:'#3b82f6' },
    'completed':   { bg:'#f1f5f9', color:'#64748b', dot:'#94a3b8' },
    'failed':      { bg:'#fef2f2', color:'#dc2626', dot:'#ef4444' },
    'busy':        { bg:'#fff7ed', color:'#c2410c', dot:'#f97316' },
    'no-answer':   { bg:'#fafafa', color:'#6b7280', dot:'#9ca3af' },
  };

  grid.innerHTML = calls.map(call => {
    const sid      = call.Sid || '';
    const from     = call.From  || '-';
    const to       = call.To    || '-';
    const exophone = call.PhoneNumberSid || '-';
    const dir      = call.Direction || '';
    const status   = (call.Status || '').toLowerCase();
    const start    = call.StartTime
      ? new Date(call.StartTime).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
      : '-';

    const active   = isActive(call);
    const dirIcon  = dir === 'inbound' ? '📲' : '📞';
    const dirLabel = dir === 'inbound' ? 'Incoming' : dir === 'outbound-dial' ? 'Outgoing' : dir || 'Outgoing';
    const dirColor = dir === 'inbound' ? '#059669' : '#0284c7';
    const sc       = SC[status] || { bg:'#f1f5f9', color:'#64748b', dot:'#94a3b8' };
    const pulse    = active ? 'animation:lwbPulse 1.4s ease infinite;' : '';

    const listenBlock = active
      ? `<div class="lwb-listen-form" id="lwb-form-${sid}">
           <input class="lwb-phone-input" id="lwb-phone-${sid}" type="tel"
             placeholder="+91XXXXXXXXXX (your phone)"
             value="${LWB.myPhone}" />
           <button class="lwb-btn lwb-btn-listen" id="lwb-listenb-${sid}" onclick="lwbListen('${sid}')">🎧 Listen</button>
         </div>`
      : `<div class="lwb-ended-badge">Call ended</div>`;

    return `
      <div class="lwb-call-card${active ? ' lwb-call-card-active' : ''}">
        <div class="lwb-call-header">
          <span class="lwb-dir-badge" style="color:${dirColor};">${dirIcon} ${dirLabel}</span>
          <span class="lwb-status-pill" style="background:${sc.bg};color:${sc.color};">
            <span style="width:6px;height:6px;border-radius:50%;background:${sc.dot};display:inline-block;${pulse}"></span>
            ${status || 'unknown'}
          </span>
        </div>
        <div class="lwb-call-numbers">
          <div class="lwb-num-row"><span class="lwb-num-label">From</span><span class="lwb-num-val">${from}</span></div>
          <div class="lwb-num-row"><span class="lwb-num-label">To</span><span class="lwb-num-val">${to}</span></div>
          <div class="lwb-num-row"><span class="lwb-num-label">ExoPhone</span><span class="lwb-num-val">${exophone}</span></div>
          <div class="lwb-num-row"><span class="lwb-num-label">Started</span><span class="lwb-num-val" style="font-family:inherit;">${start}</span></div>
        </div>
        <div class="lwb-call-sid">${sid}</div>
        ${listenBlock}
      </div>`;
  }).join('');
}

// ── Listen ────────────────────────────────────────────────────────────────────
async function lwbListen(callSid) {
  const phoneInput = document.getElementById(`lwb-phone-${callSid}`);
  const phone      = phoneInput?.value.trim();
  if (!phone) {
    lwbToast('Enter your phone number to listen on.', 'warn');
    phoneInput?.focus();
    return;
  }

  const btn = document.getElementById(`lwb-listenb-${callSid}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting…'; }

  try {
    const joinRes  = await fetch(`/api/lwb/calls/${encodeURIComponent(callSid)}/legs`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ Action: 'listen', PhoneNumber: phone }),
    });
    const joinData = await joinRes.json();

    if (!joinRes.ok) {
      const err = joinData?.error?.Message || joinData?.error || 'Failed to join call.';
      lwbToast(typeof err === 'object' ? JSON.stringify(err) : err, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🎧 Listen'; }
      return;
    }

    // Save the phone for next time
    LWB.myPhone = phone;
    localStorage.setItem('lwb_my_phone', phone);
    const topInput = document.getElementById('lwb-my-phone-input');
    if (topInput) topInput.value = phone;

    LWB.listening[callSid] = { phone };
    const form = document.getElementById(`lwb-form-${callSid}`);
    if (form) {
      form.outerHTML = `<div class="lwb-listening-badge">🎧 Listening - your phone (${phone}) will ring shortly</div>`;
    }
    lwbToast(`Your phone (${phone}) will ring now. Pick up to silently listen.`, 'success', 10000);

  } catch (e) {
    lwbToast('Network error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🎧 Listen'; }
  }
}

// ── Status bar ────────────────────────────────────────────────────────────────
function lwbSetStatus(state, msg) {
  const bar = document.getElementById('lwb-status-bar');
  if (!bar) return;
  const colors = {
    refreshing: { bg:'#f0f9ff', border:'#bae6fd', color:'#0369a1', icon:'⟳' },
    ok:         { bg:'#f0fdf4', border:'#86efac', color:'#15803d', icon:'●' },
    error:      { bg:'#fef2f2', border:'#fca5a5', color:'#dc2626', icon:'✕' },
  };
  const c    = colors[state] || colors.ok;
  const spin = state === 'refreshing' ? 'style="display:inline-block;animation:lwbSpin 1s linear infinite;"' : '';
  bar.style.cssText = `display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px;
    background:${c.bg};border:1px solid ${c.border};color:${c.color};
    font-size:0.82rem;font-weight:500;margin-bottom:16px;`;
  bar.innerHTML = `<span ${spin}>${c.icon}</span><span style="flex:1;">${msg || ''}</span>
    <button onclick="lwbRefresh()" style="background:none;border:1px solid currentColor;
    border-radius:6px;padding:2px 10px;cursor:pointer;color:inherit;font-size:0.78rem;font-weight:600;">
    ↻ Refresh now</button>`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _lwbToastTimer = null;
function lwbToast(msg, type = 'info', duration = 5000) {
  const el = document.getElementById('lwb-toast');
  if (!el) return;
  const C = {
    success: { bg:'#dcfce7', border:'#86efac', color:'#15803d', icon:'✓' },
    error:   { bg:'#fef2f2', border:'#fca5a5', color:'#dc2626', icon:'✕' },
    warn:    { bg:'#fffbeb', border:'#fcd34d', color:'#92400e', icon:'⚠' },
    info:    { bg:'#f0f9ff', border:'#7dd3fc', color:'#0369a1', icon:'ℹ' },
  }[type] || { bg:'#f0f9ff', border:'#7dd3fc', color:'#0369a1', icon:'ℹ' };
  el.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:8px;
    background:${C.bg};border:1px solid ${C.border};color:${C.color};
    font-size:0.88rem;font-weight:500;margin-top:12px;`;
  el.innerHTML = `<span>${C.icon}</span><span style="flex:1;">${msg}</span>
    <button onclick="document.getElementById('lwb-toast').style.display='none'"
      style="background:none;border:none;cursor:pointer;color:inherit;font-size:1.1rem;">×</button>`;
  clearTimeout(_lwbToastTimer);
  if (duration > 0) _lwbToastTimer = setTimeout(() => { el.style.display = 'none'; }, duration);
}
