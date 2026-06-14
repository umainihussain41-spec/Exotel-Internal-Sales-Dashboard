// ═══════════════════════════════════════════════════════════
// TASK HUB JS — matches Exotel light-blue style
// - Instant smart parsing during task creation
// - Modern cards with details drawer, description, subtasks
// - No "AI" branding anywhere in the user interface
// ═══════════════════════════════════════════════════════════
'use strict';

let lnrFilter  = 'all';
let lnrSort    = 'created';
let lnrExpanded = new Set();
let lnrThinking = new Set();
let lnrLastNew  = null;

let lnrReminderTimer = null;
let lnrRingerInt = null;
let lnrAudioCtx = null;
let lnrOscs = [];

let lnrSelDate = null;
let lnrCalM = new Date().getMonth();
let lnrCalY = new Date().getFullYear();

let lnrVoice = null;
const SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;

// AudioContext activation on click
document.addEventListener('click', () => {
    try {
        if (!lnrAudioCtx) lnrAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (lnrAudioCtx.state === 'suspended') lnrAudioCtx.resume();
    } catch(e) {}
}, { once: false });

// Boot
document.addEventListener('DOMContentLoaded', () => {
    lnrInit();
    lnrStartReminderScanner();
});

function lnrInit() {
    const inp      = document.getElementById('todo-input-title');
    const addBtn   = document.getElementById('btn-todo-add');
    const voiceBtn = document.getElementById('btn-todo-voice-bar');
    const timeTrig = document.getElementById('todo-time-picker-trigger');
    const dtDrop   = document.getElementById('todo-datetime-dropdown');
    const notifBtn = document.getElementById('btn-request-notif-perm');
    const calPrev  = document.getElementById('cal-prev-month');
    const calNext  = document.getElementById('cal-next-month');
    const dtClear  = document.getElementById('btn-datetime-clear');
    const dtApply  = document.getElementById('btn-datetime-apply');
    const sortSel  = document.getElementById('todo-sort-select');

    if (addBtn)   addBtn.addEventListener('click', lnrHandleAdd);
    if (notifBtn) notifBtn.addEventListener('click', lnrRequestNotif);

    if (inp) {
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); lnrHandleAdd(); }
        });
    }

    if (timeTrig && dtDrop) {
        timeTrig.addEventListener('click', e => {
            e.stopPropagation();
            dtDrop.classList.toggle('hidden');
            if (!dtDrop.classList.contains('hidden')) lnrRenderCal();
        });
        dtDrop.addEventListener('click', e => e.stopPropagation());
    }

    document.addEventListener('click', () => {
        if (dtDrop) dtDrop.classList.add('hidden');
    });

    if (calPrev) calPrev.addEventListener('click', () => {
        lnrCalM--; if (lnrCalM < 0) { lnrCalM = 11; lnrCalY--; }
        lnrRenderCal();
    });
    if (calNext) calNext.addEventListener('click', () => {
        lnrCalM++; if (lnrCalM > 11) { lnrCalM = 0; lnrCalY++; }
        lnrRenderCal();
    });

    document.querySelectorAll('.th-dt-preset').forEach(b =>
        b.addEventListener('click', () => lnrPreset(b.getAttribute('data-preset')))
    );

    if (dtApply) dtApply.addEventListener('click', lnrApplyDT);
    if (dtClear) dtClear.addEventListener('click', lnrClearDT);

    // Filter cards in stats row
    document.querySelectorAll('.lnr-stat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            lnrFilter = pill.getAttribute('data-filter');
            document.querySelectorAll('.lnr-stat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            lnrRender();
        });
    });

    if (sortSel) sortSel.addEventListener('change', () => {
        lnrSort = sortSel.value;
        lnrRender();
    });

    if (voiceBtn) lnrSetupVoice(voiceBtn, inp);

    lnrFetch();
}

// Voice Recognition
let lnrMediaRecorder;
let lnrAudioChunks = [];
let lnrVoiceInputOriginal = '';

function lnrSetupVoice(btn, inp) {
    if (!SpeechRecog) {
        btn.style.opacity = '0.3';
        btn.addEventListener('click', () => showToast('Voice requires Chrome/Edge.', 'warning'));
        return;
    }

    btn.addEventListener('click', async () => {
        if (btn.classList.contains('recording')) {
            btn.classList.remove('recording');
            if (lnrVoice) lnrVoice.stop();
            if (lnrMediaRecorder && lnrMediaRecorder.state !== 'inactive') {
                lnrMediaRecorder.stop();
            }
            return;
        }

        btn.classList.add('recording');
        lnrVoiceInputOriginal = inp ? inp.value : '';
        lnrAudioChunks = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            lnrMediaRecorder = new MediaRecorder(stream);
            
            lnrMediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) lnrAudioChunks.push(e.data);
            };
            
            lnrMediaRecorder.onstop = () => {
                const audioBlob = new Blob(lnrAudioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.webm');
                
                showToast('Parsing voice with Gemini...', 'info');
                fetch('/api/todos/voice', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);
                    showToast('Task added from voice!', 'success');
                    if (inp) inp.value = '';
                    lnrFetch();
                })
                .catch(err => {
                    showToast('Voice parse failed: ' + err.message, 'warning');
                })
                .finally(() => {
                    stream.getTracks().forEach(t => t.stop());
                });
            };
            
            lnrMediaRecorder.start();
            
            lnrVoice = new SpeechRecog();
            lnrVoice.continuous = true;
            lnrVoice.interimResults = true;
            lnrVoice.lang = 'en-US';
            
            lnrVoice.onend = () => {
                btn.classList.remove('recording');
                if (lnrMediaRecorder && lnrMediaRecorder.state !== 'inactive') {
                    lnrMediaRecorder.stop();
                }
            };
            
            lnrVoice.onerror = (e) => {
                if (e.error !== 'no-speech') {
                    showToast(e.error === 'not-allowed' ? 'Mic permission denied.' : 'Voice error: ' + e.error, 'warning');
                }
                btn.classList.remove('recording');
                if (lnrMediaRecorder && lnrMediaRecorder.state !== 'inactive') {
                    lnrMediaRecorder.stop();
                }
            };
            
            lnrVoice.onresult = (e) => {
                let finalT = '';
                let interimT = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    if (e.results[i].isFinal) finalT += e.results[i][0].transcript;
                    else interimT += e.results[i][0].transcript;
                }
                if (inp) {
                    const currentText = lnrVoiceInputOriginal.trim() ? lnrVoiceInputOriginal.trim() + ' ' : '';
                    inp.value = currentText + finalT + interimT;
                }
            };
            
            lnrVoice.start();
            
        } catch(e) {
            btn.classList.remove('recording');
            showToast('Failed to start microphone: ' + e.message, 'warning');
        }
    });
}

// Calendar Picker
function lnrRenderCal() {
    const grid  = document.getElementById('custom-calendar-days-grid');
    const label = document.getElementById('cal-month-year');
    if (!grid || !label) return;

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = `${months[lnrCalM]} ${lnrCalY}`;
    grid.innerHTML = '';

    const firstDay = new Date(lnrCalY, lnrCalM, 1).getDay();
    const numDays  = new Date(lnrCalY, lnrCalM + 1, 0).getDate();
    const today    = new Date(); today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
        const c = document.createElement('div');
        c.className = 'th-cal-day empty';
        grid.appendChild(c);
    }

    for (let d = 1; d <= numDays; d++) {
        const c = document.createElement('div');
        const cd = new Date(lnrCalY, lnrCalM, d);
        c.className = 'th-cal-day';
        c.textContent = d;

        if (lnrSelDate && lnrSelDate.getDate()===d && lnrSelDate.getMonth()===lnrCalM && lnrSelDate.getFullYear()===lnrCalY) {
            c.classList.add('selected');
        }
        if (cd < today) {
            c.classList.add('disabled');
        } else {
            c.addEventListener('click', () => {
                lnrSelDate = cd;
                const hid = document.getElementById('custom-picker-date-value');
                if (hid) hid.value = `${lnrCalY}-${String(lnrCalM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                lnrRenderCal();
            });
        }
        grid.appendChild(c);
    }
}

// Presets
function lnrPreset(type) {
    const now = new Date();
    let t = new Date();
    if      (type === '30m')      t = new Date(now.getTime() + 30*60*1000);
    else if (type === '2h')       t = new Date(now.getTime() + 120*60*1000);
    else if (type === 'tonight')  { t.setHours(20,0,0,0); if (t<now) t.setDate(t.getDate()+1); }
    else if (type === 'tomorrow') { t.setDate(t.getDate()+1); t.setHours(9,0,0,0); }
    else if (type === 'next-mon') {
        const d = (1+7-t.getDay())%7||7;
        t.setDate(t.getDate()+d); t.setHours(10,0,0,0);
    }
    lnrSelDate = t; lnrCalM = t.getMonth(); lnrCalY = t.getFullYear();
    let h24 = t.getHours(), m = Math.round(t.getMinutes()/5)*5;
    if (m>=60) { m=0; h24++; }
    const ampm = h24>=12 ? 'PM' : 'AM';
    let h12 = h24%12; if (!h12) h12=12;
    const hs = document.getElementById('custom-picker-hour');
    const ms = document.getElementById('custom-picker-minute');
    const as = document.getElementById('custom-picker-ampm');
    if (hs) hs.value = String(h12);
    if (ms) ms.value = String(m).padStart(2,'0');
    if (as) as.value = ampm;
    const hid = document.getElementById('custom-picker-date-value');
    if (hid) hid.value = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    lnrRenderCal();
    lnrApplyDT();
}

function lnrApplyDT() {
    if (!lnrSelDate) { showToast('Pick a date first.', 'warning'); return; }
    const h = parseInt(document.getElementById('custom-picker-hour').value);
    const m = parseInt(document.getElementById('custom-picker-minute').value);
    const a = document.getElementById('custom-picker-ampm').value;
    let h24 = h;
    if (a==='PM' && h!==12) h24+=12;
    if (a==='AM' && h===12) h24=0;
    const final = new Date(lnrSelDate.getFullYear(), lnrSelDate.getMonth(), lnrSelDate.getDate(), h24, m);
    if (final <= new Date()) { showToast('Must be in the future.', 'warning'); return; }
    const lbl = document.getElementById('selected-time-label');
    const trig = document.getElementById('todo-time-picker-trigger');
    const drop = document.getElementById('todo-datetime-dropdown');
    if (lbl) lbl.textContent = final.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    if (trig) { trig.setAttribute('data-timestamp', final.toISOString()); trig.classList.add('has-date'); }
    if (drop) drop.classList.add('hidden');
}

function lnrClearDT() {
    lnrSelDate = null;
    const hid = document.getElementById('custom-picker-date-value');
    if (hid) hid.value = '';
    const h = document.getElementById('custom-picker-hour');
    const m = document.getElementById('custom-picker-minute');
    const a = document.getElementById('custom-picker-ampm');
    if (h) h.value='12'; if (m) m.value='00'; if (a) a.value='PM';
    const lbl = document.getElementById('selected-time-label');
    const trig = document.getElementById('todo-time-picker-trigger');
    const drop = document.getElementById('todo-datetime-dropdown');
    if (lbl) lbl.textContent='Set Due';
    if (trig) { trig.removeAttribute('data-timestamp'); trig.classList.remove('has-date'); }
    if (drop) drop.classList.add('hidden');
    lnrCalM = new Date().getMonth(); lnrCalY = new Date().getFullYear();
    lnrRenderCal();
}

// Notifications Support
async function lnrRequestNotif() {
    if (!('Notification' in window)) { showToast('Not supported.', 'warning'); return; }
    const p = await Notification.requestPermission();
    if (p === 'granted') {
        showToast('Alerts enabled ✓', 'success');
        const btn = document.getElementById('btn-request-notif-perm');
        if (btn) { btn.textContent = '✓ Alerts On'; btn.classList.add('on'); }
    } else showToast('Permission denied.', 'warning');
}

function lnrCheckNotifBtn() {
    const btn = document.getElementById('btn-request-notif-perm');
    if (btn && 'Notification' in window && Notification.permission === 'granted') {
        btn.textContent = '✓ Alerts On';
        btn.classList.add('on');
    }
}

// Fetch todos
async function lnrFetch() {
    try {
        const r = await fetch('/api/todos');
        if (r.ok) { window.todoList = await r.json(); lnrRender(); lnrCheckNotifBtn(); }
    } catch(e) { console.error(e); }
}

function fetchTodos() { return lnrFetch(); }

// Render todo list
function lnrRender() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    container.innerHTML = '';

    const list = window.todoList || [];
    const now  = new Date();

    const total   = list.length;
    const pending = list.filter(t => t.status==='pending').length;
    const done    = list.filter(t => t.status==='completed').length;
    const overdue = list.filter(t => t.status==='pending' && t.due_at && new Date(t.due_at)<now).length;

    // Update counts
    lnrSetCount('lnr-count-all', pending);
    lnrSetCount('lnr-count-done', done);
    lnrSetCount('lnr-count-overdue', overdue);

    // Filter list
    let filtered = list.filter(t => {
        const od = t.due_at && new Date(t.due_at)<now && t.status==='pending';
        if (lnrFilter==='all')       return t.status==='pending';
        if (lnrFilter==='pending')   return t.status==='pending';
        if (lnrFilter==='done')      return t.status==='completed';
        if (lnrFilter==='overdue')   return od;
        return true;
    });

    // Sort list
    filtered.sort((a,b) => {
        if (lnrSort==='due') {
            if (!a.due_at && !b.due_at) return 0;
            if (!a.due_at) return 1; if (!b.due_at) return -1;
            return new Date(a.due_at) - new Date(b.due_at);
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="th-empty">
                <div class="th-empty-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <h3>No tasks</h3>
                <p>Add a task above to get started.</p>
            </div>`;
        return;
    }

    filtered.forEach(todo => lnrBuildCard(todo, container, now));
}

function lnrSetCount(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Build task card markup
function lnrBuildCard(todo, container, now) {
    const isCompleted = todo.status === 'completed';
    const isOverdue   = todo.due_at && new Date(todo.due_at) < now && !isCompleted;
    const isExpanded  = lnrExpanded.has(todo.id) || todo.id === lnrLastNew;

    // Formatted due label
    let dueHtml = '', isDueSoon = false;
    if (todo.due_at) {
        const dd = new Date(todo.due_at);
        const diff = dd - now;
        const dayMs = 86400000;
        dueHtml = dd.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        if (diff > 0 && diff < dayMs * 2) isDueSoon = true;
    }

    // Build meta chips
    let chipsHtml = '';
    
    // 1. Due date chip
    if (todo.due_at) {
        const dueCls = isOverdue ? 'overdue' : (isDueSoon ? 'soon' : '');
        chipsHtml += `<span class="th-meta-chip th-chip-due ${dueCls}">📅 ${dueHtml}</span>`;
    }

    // Card element
    const card = document.createElement('div');
    card.className = [
        'th-card',
        isCompleted ? 'done' : '',
        isExpanded ? 'expanded' : ''
    ].filter(Boolean).join(' ');
    card.setAttribute('data-id', todo.id);

    card.innerHTML = `
        <div class="th-card-summary">
            <div class="th-check ${isCompleted ? 'checked' : ''}"
                 onclick="event.stopPropagation(); toggleTodoStatus(${todo.id}, '${todo.status}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div class="th-card-title-area">
                <div class="th-card-title" onclick="event.stopPropagation(); lnrEditTitle(${todo.id}, this)">${lnrEsc(todo.title)}</div>
                <div class="th-card-meta">${chipsHtml}</div>
            </div>
            <div class="th-card-actions">
                <button class="th-card-btn" title="Toggle Details">
                    <svg class="th-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <button class="th-card-btn del" title="Delete Task" onclick="event.stopPropagation(); deleteTodo(${todo.id})">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        </div>`;

    card.addEventListener('click', e => {
        if (e.target.closest('.th-check') ||
            e.target.closest('.th-card-btn') ||
            e.target.closest('.th-card-title') ||
            e.target.closest('.th-card-detail')) return;
            
        const willExpand = !card.classList.contains('expanded');
        card.classList.toggle('expanded');
        if (willExpand) lnrExpanded.add(todo.id);
        else { lnrExpanded.delete(todo.id); if (todo.id===lnrLastNew) lnrLastNew=null; }
        panel.style.maxHeight = willExpand ? '1000px' : '0px';
    });

    // Detail panel
    const panel = document.createElement('div');
    panel.className = 'th-card-detail';
    if (isExpanded) {
        panel.style.maxHeight = '1000px';
    }

    const notesDisplay = todo.notes
        ? lnrEsc(todo.notes)
        : `<span class="th-notes-placeholder">Add a description…</span>`;

    panel.innerHTML = `
        <div class="th-detail-main">
            <div>
                <div class="th-section-label">Description</div>
                <div class="th-notes-field" onclick="event.stopPropagation(); lnrEditNotes(${todo.id}, this)">${notesDisplay}</div>
            </div>
        </div>
        <div class="th-detail-side">
            <div class="th-meta-item">
                <div class="th-meta-label">Status</div>
                <div class="th-meta-val">${isCompleted ? '✓ Done' : isOverdue ? '⚠ Overdue' : '○ In Progress'}</div>
            </div>
            ${todo.due_at ? `
            <div class="th-meta-item">
                <div class="th-meta-label">Due Date</div>
                <div class="th-meta-val">${new Date(todo.due_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            </div>` : ''}
        </div>`;

    card.appendChild(panel);
    container.appendChild(card);
}

// Inline edit title
function lnrEditTitle(todoId, el) {
    if (el.querySelector('input')) return;
    const orig = el.textContent.trim();
    el.innerHTML = `<input type="text" class="th-title-edit" value="${orig.replace(/"/g,'&quot;')}">`;
    const inp = el.querySelector('input');
    inp.focus(); inp.select();
    inp.addEventListener('click', e => e.stopPropagation());

    const save = async () => {
        const val = inp.value.trim();
        if (!val) { el.textContent = orig; return; }
        if (val === orig) { el.textContent = orig; return; }
        try {
            const r = await fetch(`/api/todos/${todoId}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ title: val })
            });
            if (r.ok) { showToast('Updated.','success'); lnrFetch(); }
            else el.textContent = orig;
        } catch(e) { el.textContent = orig; }
    };

    inp.addEventListener('blur', save);
    inp.addEventListener('keydown', e => {
        if (e.key==='Enter') { e.preventDefault(); inp.blur(); }
        else if (e.key==='Escape') { e.preventDefault(); inp.removeEventListener('blur',save); el.textContent=orig; }
    });
}

// Inline edit notes
function lnrEditNotes(todoId, el) {
    if (el.querySelector('textarea')) return;
    const isPlaceholder = !!el.querySelector('.th-notes-placeholder');
    const orig = isPlaceholder ? '' : el.textContent.trim();
    el.innerHTML = `<textarea class="th-notes-edit">${orig}</textarea>`;
    const ta = el.querySelector('textarea');
    ta.focus(); ta.select();
    ta.addEventListener('click', e => e.stopPropagation());

    const save = async () => {
        const val = ta.value.trim();
        if (val === orig) {
            el.innerHTML = orig || `<span class="th-notes-placeholder">Add a description…</span>`;
            return;
        }
        try {
            const r = await fetch(`/api/todos/${todoId}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ notes: val })
            });
            if (r.ok) { showToast('Saved.','success'); lnrFetch(); }
            else el.innerHTML = orig || `<span class="th-notes-placeholder">Add a description…</span>`;
        } catch(e) { el.innerHTML = orig || `<span class="th-notes-placeholder">Add a description…</span>`; }
    };

    ta.addEventListener('blur', save);
    ta.addEventListener('keydown', e => {
        if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); }
        else if (e.key==='Escape') { e.preventDefault(); ta.removeEventListener('blur',save); el.innerHTML=orig||`<span class="th-notes-placeholder">Add a description…</span>`; }
    });
}

// Add Task with loader during Gemini analysis
async function lnrHandleAdd() {
    const inp    = document.getElementById('todo-input-title');
    const trig   = document.getElementById('todo-time-picker-trigger');
    const addBtn = document.getElementById('btn-todo-add');
    if (!inp || !inp.value.trim()) { showToast('Enter a task title.','warning'); return; }

    const title = inp.value.trim();
    const ts    = trig ? trig.getAttribute('data-timestamp') : null;

    // Set loading state on add button
    const origBtnText = addBtn.innerHTML;
    addBtn.disabled = true;
    addBtn.innerHTML = `<span class="btn-spinner"></span> Creating…`;

    try {
        const r = await fetch('/api/todos', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ title, notes:'', due_at:ts||null, reminder_at:ts||null, ringer_type:'both', smart:false })
        });
        if (r.ok) {
            const d = await r.json();
            lnrLastNew = d.id;
            lnrExpanded.clear();
            lnrExpanded.add(d.id);
            inp.value = '';
            lnrClearDT();
            showToast('Task created.','success');
            await lnrFetch();
        } else {
            const e = await r.json().catch(()=>({}));
            showToast(`Failed: ${e.error||r.statusText}`,'error');
        }
    } catch(e) { 
        showToast('Connection error.','error'); 
    } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = origBtnText;
    }
}

// Run AI thinking in background (for edited tasks)
async function lnrRunAI(id) {
    lnrThinking.add(id);
    lnrRender();
    try {
        await fetch(`/api/todos/${id}/ai-think`, { method:'POST' });
    } catch(e) {} finally {
        lnrThinking.delete(id);
        await lnrFetch();
    }
}

// Toggle status of task
async function toggleTodoStatus(id, current) {
    const ns = current==='completed' ? 'pending' : 'completed';
    try {
        const r = await fetch(`/api/todos/${id}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ status: ns })
        });
        if (r.ok) {
            if (ns==='completed') { triggerConfetti(); }
            else showToast('Reopened.','success');
            lnrFetch();
        }
    } catch(e) {}
}

// Toggle subtask status
async function toggleSubtaskStatus(todoId, idx) {
    const todo = (window.todoList||[]).find(t=>t.id===todoId);
    if (!todo) return;
    const subs = todo.subtasks.map((s,i) => i===idx ? {...s,completed:!s.completed} : s);
    const allDone = subs.length>0 && subs.every(s=>s.completed);
    const payload = { subtasks: subs };
    if (allDone) payload.status = 'completed';
    try {
        const r = await fetch(`/api/todos/${todoId}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        if (r.ok) {
            if (allDone) { triggerConfetti(); }
            else showToast('Updated.','success');
            lnrFetch();
        }
    } catch(e) {}
}

// Delete todo task
async function deleteTodo(id) {
    const ok = await showConfirm('Delete this task?', { danger:true });
    if (!ok) return;
    try {
        const r = await fetch(`/api/todos/${id}`, { method:'DELETE' });
        if (r.ok) {
            showToast('Deleted.','success');
            lnrExpanded.delete(id);
            if (id===lnrLastNew) lnrLastNew=null;
            lnrFetch();
        }
    } catch(e) {}
}

// Rotate priority selection manually
async function lnrRotatePri(id, current) {
    const next = {low:'medium',medium:'high',high:'low'}[current]||'medium';
    const todo = (window.todoList||[]).find(t=>t.id===id);
    if (!todo) return;
    const ai = {...(todo.ai_data||{}), priority:next};
    try {
        const r = await fetch(`/api/todos/${id}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ai_data:ai })
        });
        if (r.ok) { showToast(`Priority → ${next}`,'success'); lnrFetch(); }
    } catch(e) {}
}

// Subtasks CRUD
async function addCustomSubtask(todoId) {
    const inp = document.getElementById(`th-sub-${todoId}`);
    if (!inp) return;
    const title = inp.value.trim();
    if (!title) { showToast('Cannot be empty.','warning'); return; }
    const todo = (window.todoList||[]).find(t=>t.id===todoId);
    if (!todo) return;
    const subs = [...(todo.subtasks||[]), { title, completed:false }];
    try {
        const r = await fetch(`/api/todos/${todoId}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ subtasks:subs })
        });
        if (r.ok) { showToast('Subtask added.','success'); lnrFetch(); }
    } catch(e) {}
}

async function deleteCustomSubtask(todoId, idx) {
    const todo = (window.todoList||[]).find(t=>t.id===todoId);
    if (!todo) return;
    const subs = (todo.subtasks||[]).filter((_,i)=>i!==idx);
    try {
        const r = await fetch(`/api/todos/${todoId}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ subtasks:subs })
        });
        if (r.ok) { showToast('Removed.','success'); lnrFetch(); }
    } catch(e) {}
}

// Reminders Scanner
function lnrStartReminderScanner() {
    if (lnrReminderTimer) clearInterval(lnrReminderTimer);
    lnrReminderTimer = setInterval(lnrCheckReminders, 5000);
}

function lnrCheckReminders() {
    const list = window.todoList || [];
    const now  = new Date();
    list.forEach(async todo => {
        if (todo.status !== 'pending') return;
        if (todo.reminder_at && todo.alert_rung !== 1 && new Date(todo.reminder_at) <= now) {
            todo.alert_rung = 1;
            try { await fetch(`/api/todos/${todo.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({alert_rung:1})}); } catch(e) {}
            lnrFireAlarm(todo, 'Reminder');
        }
        if (todo.ai_data?.reminders) {
            const aiData = {...todo.ai_data, reminders:[...todo.ai_data.reminders]};
            let upd = false;
            for (const r of aiData.reminders) {
                if (r.rung!==1 && new Date(r.time)<=now) {
                    r.rung = 1; upd = true;
                    lnrFireAlarm(todo, r.reason||'Reminder');
                }
            }
            if (upd) {
                todo.ai_data = aiData;
                try {
                    await fetch(`/api/todos/${todo.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ai_data:aiData})});
                    lnrRender();
                } catch(e) {}
            }
        }
    });
}

function lnrFireAlarm(todo, source) {
    const type = todo.ringer_type || 'both';
    if ((type==='both'||type==='silent') && 'Notification' in window && Notification.permission==='granted') {
        new Notification(todo.title, { body:source+(todo.notes?'\n'+todo.notes:''), icon:'/favicon.png', requireInteraction:true });
    }
    if (type==='both'||type==='audible') { lnrStartRinger(); lnrShowAlarm(todo, source); }
}

function lnrStartRinger() {
    if (lnrRingerInt) return;
    lnrChime();
    lnrRingerInt = setInterval(lnrChime, 2500);
}

function lnrStopRinger() {
    if (lnrRingerInt) { clearInterval(lnrRingerInt); lnrRingerInt=null; }
    lnrOscs.forEach(o=>{try{o.stop();}catch(e){}});
    lnrOscs = [];
}

function lnrChime() {
    try {
        if (!lnrAudioCtx) lnrAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
        if (lnrAudioCtx.state==='suspended') lnrAudioCtx.resume();
        const ctx=lnrAudioCtx, t=ctx.currentTime;
        const o1=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain();
        o1.type='sine'; o1.frequency.setValueAtTime(880,t);
        o2.type='sine'; o2.frequency.setValueAtTime(1046.5,t);
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.2,t+0.05);
        g.gain.setValueAtTime(0.2,t+0.15);
        g.gain.linearRampToValueAtTime(0,t+0.2);
        g.gain.linearRampToValueAtTime(0.2,t+0.3);
        g.gain.exponentialRampToValueAtTime(0.001,t+1.2);
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.start(t); o2.start(t); o1.stop(t+1.3); o2.stop(t+1.3);
        lnrOscs.push(o1,o2);
    } catch(e) {}
}

function lnrShowAlarm(todo, source) {
    if (document.getElementById('todo-alarm-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'todo-alarm-overlay';
    ov.className = 'th-alarm-overlay';
    ov.innerHTML = `
        <div class="th-alarm-card">
            <div class="th-alarm-icon">🔔</div>
            <div class="th-alarm-source">${lnrEsc(source)}</div>
            <h2 class="th-alarm-title">${lnrEsc(todo.title)}</h2>
            <p class="th-alarm-msg">${todo.notes ? lnrEsc(todo.notes) : 'Time to work on this task!'}</p>
            <button class="th-alarm-dismiss" id="btn-dismiss-alarm">Dismiss</button>
        </div>`;
    document.body.appendChild(ov);
    document.getElementById('btn-dismiss-alarm').addEventListener('click', () => {
        lnrStopRinger(); ov.remove(); lnrFetch();
    });
}

// Confetti effect on completion
function triggerConfetti() {
    let c = document.getElementById('th-confetti');
    if (!c) { c=document.createElement('canvas'); c.id='th-confetti'; document.body.appendChild(c); }
    const ctx=c.getContext('2d');
    c.width=window.innerWidth; c.height=window.innerHeight;
    const cols=['#0284c7','#38bdf8','#10b981','#f59e0b','#ef4444'];
    const pts = Array.from({length:90},()=>({
        x:Math.random()*c.width, y:c.height+10,
        vx:(Math.random()-.5)*7, vy:-(Math.random()*9+9),
        size:Math.random()*7+3, color:cols[Math.floor(Math.random()*cols.length)],
        rot:Math.random()*360, rs:(Math.random()-.5)*.1, opacity:1
    }));
    let alive=true;
    (function anim() {
        if (!alive) return;
        ctx.clearRect(0,0,c.width,c.height);
        let any=false;
        pts.forEach(p=>{
            p.x+=p.vx; p.y+=p.vy; p.vy+=0.35; p.rot+=p.rs;
            if (p.vy>0) p.opacity-=0.018;
            if (p.opacity>0 && p.y<c.height+50) {
                any=true;
                ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
                ctx.globalAlpha=p.opacity; ctx.fillStyle=p.color;
                ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore();
            }
        });
        if (any) requestAnimationFrame(anim); else { alive=false; c.remove(); }
    })();
}

// Escaping helpers
function lnrEsc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Shadow global showToast to use ISD Modal Alert system instead of top-right toasts
function showToast(message, type = 'error') {
    const titleMap = {
        success: 'Success',
        warning: 'Alert',
        error: 'Error',
        info: 'Info'
    };
    if (typeof showAlert === 'function') {
        showAlert(message, { title: titleMap[type] || 'Task Hub', type });
    } else {
        console.log('[Task Hub] Notification:', message);
    }
}
