// TASK-0178 — DES-0006's layer over the towers page, inlined after overview-towers-page.js
// by agents-page.mjs, in the same module, so it uses the towers page's own state and marks.
// It draws the agent sessions the cockpit has recorded (ADR-0009): each at the tower of the
// ticket it worked on, opened as a session in the right pane; one Needs you with permission
// requests and waiting agents first; the cockpit's overview panels as pictures; the shell
// drawer; and "Work on this" on a ticket's card. No prompt, reply or command text exists in
// its data, so none is drawn.

const AGENT = { claude: { word: 'Claude', colour: '#f0a77e', glyph: '✳' }, codex: { word: 'Codex', colour: '#9fb7ff', glyph: '◎' } };
const STATE_LOOK = { busy: ['working', '#5fe0ff'], waiting: ['waiting for you', '#ffb54d'], 'needs-input': ['needs you', MARK.needs], idle: ['idle', '#7f93a3'] };
const lookOf = (s) => STATE_LOOK[s.state] ?? STATE_LOOK.idle;
const when = (iso) => (iso ? new Date(iso).toISOString().replace('T', ' ').slice(5, 16) : '');
const sessionById = (id) => state.d.agents.sessions.find((s) => s.id === id);

/** Where a session stands: over the tower or tile of the ticket it last changed, else the first it touched. */
function sessionAnchor(s) {
  const primary = s.changed.length > 0 ? s.changed[s.changed.length - 1][0] : s.tickets[0];
  const w = primary ? state.where.get(primary) : undefined;
  if (!w) return null;
  const base = w.tower !== undefined ? state.towerTops.get(w.phase + ':' + w.tower).clone() : w.at.clone();
  // High enough to stand clear of the pictures standing over the same tower (TASK-0179).
  return { at: base.add(new THREE.Vector3(0, 12, 0)), primary, phase: w.phase };
}

const ORB = new THREE.SphereGeometry(0.85, 20, 14);
const HALO = new THREE.TorusGeometry(1.3, 0.12, 8, 40);
layers.push(() => {
  const group = new THREE.Group();
  world.add(group);
  state.agentGroup = group;
  state.orbs = new Map();
  const spots = new Map();
  for (const s of state.d.agents.sessions) {
    const a = sessionAnchor(s);
    if (!a) continue;
    const key = a.primary;
    const n = spots.get(key) ?? 0;
    spots.set(key, n + 1);
    // Several sessions on one ticket stand side by side round it.
    const at = a.at.clone().add(new THREE.Vector3(Math.cos(n * 2.1) * n * 1.9, n * 0.6, Math.sin(n * 2.1) * n * 1.9));
    const [, stateColour] = lookOf(s);
    const orb = new THREE.Mesh(ORB, new THREE.MeshBasicMaterial({ color: new THREE.Color(stateColour), transparent: true, opacity: 0.95 }));
    orb.position.copy(at);
    orb.userData.extra = { tip: () => sessionTip(s), press: () => openSession(s.id) };
    const halo = new THREE.Mesh(HALO, new THREE.MeshBasicMaterial({ color: new THREE.Color(AGENT[s.agent].colour), transparent: true, opacity: 0.9 }));
    halo.position.copy(at);
    halo.rotation.x = Math.PI / 2;
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at, a.at.clone().add(new THREE.Vector3(0, -11, 0))]), new THREE.LineBasicMaterial({ color: new THREE.Color(AGENT[s.agent].colour), transparent: true, opacity: 0.5 }));
    const tag = label(AGENT[s.agent].glyph + ' ' + AGENT[s.agent].word + ' · ' + lookOf(s)[0], 1.05, AGENT[s.agent].colour, 700, true);
    tag.position.copy(at).add(new THREE.Vector3(0, 1.9, 0));
    tag.userData.keep = true;
    group.add(orb, halo, stem, tag);
    state.extraPick.push(orb);
    // A working session breathes, as the focus feature's tasks do.
    if (s.state === 'busy') {
      orb.material.userData.base = 0.95;
      state.pulses.push(orb.material);
    }
    state.orbs.set(s.id, { at, phase: a.phase, orb, group: [orb, halo, stem, tag] });
  }
  drawAgents();
  drawOverviewPanels();
  drawDrawer();
});

function sessionTip(s) {
  const c = s.cost;
  return '<b>' + AGENT[s.agent].glyph + ' ' + AGENT[s.agent].word + '</b> ' + esc(s.id) + ' · ' + esc(lookOf(s)[0]) + '<div class="sub">' + s.tickets.length + ' tickets · ' + s.files + ' files · last ' + esc(when(s.last)) + (c ? ' · context ' + c.context + '%' : '') + '</div><div class="sub">Press to open the session.</div>';
}

/** A session opened: its tickets lit and joined to it, the rest faded, the session in the right pane. */
function openSession(id) {
  const s = sessionById(id);
  if (!s) return;
  clearFound();
  clearSelection();
  clearMarks();
  state.session = id;
  const o = state.orbs.get(id);
  const ids = s.tickets.filter((t) => state.where.has(t)).slice(0, MAX_CURVES);
  for (const t of ids) {
    const to = state.where.get(t).at;
    const r = state.ticketRow.get(t);
    const colour = colourOf(MARK.type[r[TYPE]]);
    if (o) {
      const from = o.at;
      const span = from.distanceTo(to);
      const curve = new THREE.CubicBezierCurve3(from.clone(), from.clone().add(new THREE.Vector3(0, 2 + span * 0.15, 0)), to.clone().add(new THREE.Vector3(0, 2 + span * 0.15, 0)), to.clone());
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, Math.ceil(span)), 0.08, 6, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(AGENT[s.agent].colour), transparent: true, opacity: 0.8, depthTest: false, blending: THREE.AdditiveBlending }));
      tube.renderOrder = 12;
      state.marks.add(tube);
    }
    outline(to, colour, 1.75, ids.length <= MAX_TAGS ? t : null);
  }
  setHush(true);
  drawSessionPane(s);
  document.getElementById('card').hidden = true;
  document.getElementById('legend').hidden = true;
  window.__towers.session = id;
}

function closeSession() {
  state.session = null;
  clearMarks();
  setHush(false);
  if (state.open !== null) drawPanel(state.open);
  else document.getElementById('panel').hidden = true;
  syncOffset();
  window.__towers.session = null;
}

// Escape and every other way out of a selection closes a session first.
const towersClearSelection = clearSelection;
clearSelection = function () {
  if (state && state.session) {
    closeSession();
    return true;
  }
  return towersClearSelection();
};

const bar = (label, value, max, colour, suffix) => '<div class="meter"><span>' + esc(label) + '</span><i><b style="width:' + Math.min(100, Math.round((100 * (value ?? 0)) / max)) + '%;background:' + colour + '"></b></i><em>' + (value === null || value === undefined ? '—' : esc(String(value)) + (suffix ?? '')) + '</em></div>';

/** The session in the right pane, the way T3 Code draws one: who, how far, what it works on, what it did, what it asks. */
function drawSessionPane(s) {
  const a = AGENT[s.agent];
  const [word, colour] = lookOf(s);
  const c = s.cost;
  const requests = state.d.agents.requests.filter((r) => r.session === s.id);
  const changed = new Map(s.changed.map(([id, status, ts]) => [id, [status, ts]]));
  const rows = s.tickets.slice(0, 40).map((id) => state.ticketRow.get(id)).filter(Boolean);
  let html = '<div class="session-head"><span class="glyph" style="color:' + a.colour + '">' + a.glyph + '</span><div><h2>' + a.word + ' · ' + esc(s.id) + '</h2><div class="sub"><span class="state" style="background:' + colour + '"></span>' + esc(word) + ' · started ' + esc(when(s.started)) + ' · last ' + esc(when(s.last)) + (s.ended ? ' · ended' : '') + '</div></div></div>';
  if (c) html += '<div class="meters">' + bar('Context', c.context, 100, '#5fe0ff', '%') + bar('5 hours', c.fiveHour, 100, '#ffb54d', '%') + bar('Week', c.week, 100, '#f0a77e', '%') + '<div class="costline">' + c.minutes + ' min · ' + Math.round((c.window ?? 0) / 1000) + 'k window</div></div>';
  html += '<h3>Working on · ' + s.tickets.length + '</h3>' + (rows.length === 0 ? '<div class="sub">It changed no ticket this page knows.</div>' : rows.map((r) => {
    const ch = changed.get(r[ID]);
    return rowHtml(r, r[ID] === state.d.next).replace('</div>', (ch ? '<span class="moved">→ ' + esc(ch[0]) + ' ' + esc(when(ch[1]).slice(6)) + '</span>' : '') + '</div>');
  }).join('') + (s.tickets.length > rows.length ? '<div class="sub">and ' + (s.tickets.length - rows.length) + ' more</div>' : ''));
  const tools = Object.entries(s.tools);
  html += '<h3>The conversation · ' + s.prompts + (s.prompts === 1 ? ' prompt' : ' prompts') + '</h3><div class="turn"><div class="you">Your prompts are not on this page: it is drawn from counts.</div><div class="steps">' + (tools.length === 0 ? '<span class="sub">No steps recorded</span>' : tools.map(([name, n]) => '<span class="chip">' + esc(name) + ' <b>' + n + '</b></span>').join('')) + '</div><div class="sub">' + s.files + ' files touched · ' + s.changed.length + ' tickets moved on</div></div>';
  if (requests.length > 0) {
    html += '<h3>Permission requests · ' + requests.length + '</h3>' + requests.map((r, i) => '<div class="ask' + (i === 0 ? ' first' : '') + '"><b>' + esc(r.tool) + '</b> <span class="sub">asked ' + esc(when(r.ts).slice(6)) + ' · ' + esc(r.status) + (r.closed ? ' ' + esc(when(r.closed).slice(6)) : '') + '</span>' + (i === 0 ? '<div class="answer"><button disabled>Approve</button><button disabled>Deny</button><span class="sub">as it stood before it was answered</span></div>' : '') + '</div>').join('');
  }
  html += '<div class="acts session-acts"><button disabled title="Design only">↻ Resume</button><button disabled title="Design only">⌘ Open its shell</button><button disabled title="Design only">■ Stop</button></div>';
  const panel = document.getElementById('panel');
  panel.innerHTML = html;
  panel.hidden = false;
  panel.scrollTop = 0;
  for (const el of panel.querySelectorAll('.row[data-id]')) el.addEventListener('click', () => select(el.dataset.id));
  syncOffset();
}

/** Every recorded session as a row, left middle: its agent, its state, its ticket, when. */
function drawAgents() {
  const el = document.getElementById('agents');
  const list = state.d.agents.sessions;
  el.innerHTML = '<h4>Agents<span>' + list.filter((s) => s.state !== 'idle').length + ' active of ' + list.length + '</span></h4>' + list.map((s) => {
    const a = AGENT[s.agent];
    const [word, colour] = lookOf(s);
    const first = s.changed.length > 0 ? s.changed[s.changed.length - 1][0] : s.tickets[0];
    return '<div class="ag" data-session="' + esc(s.id) + '" title="' + esc(a.word + ' ' + s.id + ' · ' + word) + '"><span class="glyph" style="color:' + a.colour + '">' + a.glyph + '</span><span class="state" style="background:' + colour + '"></span><span class="t">' + esc(first ?? 'no ticket') + (s.tickets.length > 1 ? ' +' + (s.tickets.length - 1) : '') + '</span><span class="who">' + esc(word) + '</span><span class="k">' + esc(when(s.last).slice(0, 5)) + '</span></div>';
  }).join('');
  for (const row of el.querySelectorAll('[data-session]')) row.addEventListener('click', () => openSession(row.dataset.session));
}

// One Needs you: permission requests and agents waiting first, then the tickets, then what is not pushed.
const towersDrawNeeds = drawNeeds;
drawNeeds = function () {
  towersDrawNeeds();
  const el = document.getElementById('needs');
  const ag = state.d.agents;
  const open = ag.requests.filter((r) => !['closed', 'granted', 'denied'].includes(r.status));
  const waiting = ag.sessions.filter((s) => s.state === 'waiting' || s.state === 'needs-input');
  const big = el.querySelector('.big');
  if (big) big.textContent = String(Number(big.textContent) + open.length + waiting.length);
  const last = ag.requests[0];
  const top = '<div class="nsec"><b>Permission requests</b> · ' + open.length + ' open' + (last ? '<span class="sub"> · last ' + esc(last.tool) + ', ' + esc(last.status) + ' ' + esc(when(last.closed || last.ts).slice(0, 11)) + '</span>' : '') + '</div>' +
    '<div class="nsec"><b>Agents waiting for you</b> · ' + waiting.length + '</div>' + waiting.slice(0, 3).map((s) => '<div class="ag" data-session="' + esc(s.id) + '"><span class="glyph" style="color:' + AGENT[s.agent].colour + '">' + AGENT[s.agent].glyph + '</span><span class="state" style="background:' + lookOf(s)[1] + '"></span><span class="t">' + esc(s.id) + ' · ' + esc(s.tickets[0] ?? 'no ticket') + '</span><span class="k">' + esc(when(s.last).slice(0, 11)) + '</span></div>').join('') +
    '<div class="nsec"><b>Tickets</b></div>';
  big?.insertAdjacentHTML('afterend', top);
  const p = ag.publish;
  el.insertAdjacentHTML('beforeend', '<div class="nsec"><b>Not pushed</b> · ' + (p.ahead ?? '?') + ' commits ahead · ' + (p.changed ?? '?') + ' files changed</div>');
  for (const row of el.querySelectorAll('[data-session]')) row.addEventListener('click', () => openSession(row.dataset.session));
};

/** The cockpit's overview panels as pictures, left top: since you last looked, the record, the checks, decisions waiting. */
function drawOverviewPanels() {
  const el = document.getElementById('overview');
  const d = state.d;
  const rows = [...state.ticketRow.values()];
  const seen = d.agents.seen ? d.agents.seen.slice(0, 10) : null;
  const since = seen ? rows.filter((r) => (d.notes[r[ID]]?.[2] ?? '') > seen) : [];
  const byType = (list) => {
    const m = new Map();
    for (const r of list) m.set(r[TYPE], (m.get(r[TYPE]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sq = (type) => '<span class="sq delivered" style="color:' + esc(MARK.type[type] ?? '#999') + '"></span>';
  let html = '<h4>Since you last looked<span>' + (seen ? esc(seen) : 'never') + '</span></h4><div class="since">' + (since.length === 0 ? '<span class="sub">Nothing changed.</span>' : byType(since).slice(0, 6).map(([t, n]) => '<span>' + sq(t) + n + '</span>').join('')) + '<button disabled title="Design only">Caught up</button></div>';
  html += '<h4>The record</h4><div class="tiles">' + ['feature', 'task', 'requirement', 'test', 'issue', 'risk'].map((t) => {
    const list = rows.filter((r) => r[TYPE] === t);
    if (list.length === 0) return '';
    const part = (s) => list.filter((r) => r[STATE] === s).length;
    const mix = [['closed', '1'], ['progress', '.6'], ['open', '.25'], ['dropped', '.12']].map(([s, a]) => part(s) > 0 ? '<b style="flex:' + part(s) + ';background:' + (MARK.type[t] ?? '#999') + ';opacity:' + a + '"></b>' : '').join('');
    return '<div class="tile" title="' + esc(MARK.typeWord[t] ?? t) + ': ' + part('closed') + ' done of ' + list.length + '"><div class="n">' + list.length + '</div><div class="w">' + esc(MARK.typeWord[t] ?? t) + '</div><div class="mix">' + mix + '</div></div>';
  }).join('') + '</div>';
  const tests = rows.filter((r) => r[TYPE] === 'test');
  const checks = [['passing', '#5ad19a'], ['failing', MARK.needs], ['ready', '#e9c46a'], ['active', '#5fb3c8']].map(([st, c]) => [st, c, tests.filter((r) => r[STATUS] === st).length]).filter(([, , n]) => n > 0);
  html += '<h4>Checks<span>' + tests.length + ' tests</span></h4><div class="checks">' + checks.map(([st, c, n]) => '<span><i style="background:' + c + '"></i>' + n + ' ' + esc(st === 'ready' ? 'never run' : st) + '</span>').join('') + '</div>';
  const deciding = rows.filter((r) => (r[TYPE] === 'adr' || r[TYPE] === 'design') && (r[STATUS] === 'proposed' || r[STATUS] === 'draft'));
  html += '<h4>Waiting on a decision<span>' + deciding.length + '</span></h4>' + deciding.slice(0, 3).map((r) => rowHtml(r, false)).join('');
  el.innerHTML = html;
  for (const row of el.querySelectorAll('.row[data-id]')) row.addEventListener('click', () => select(row.dataset.id, { fly: true }));
}

/** The shell drawer, bottom: plain terminals, several at once, one tab each. */
function drawDrawer() {
  const el = document.getElementById('drawer');
  const tabs = Object.values(DATA).map((w) => w.label);
  el.innerHTML = '<div class="tabs"><button class="toggle" title="Open or close the shell drawer">⌘ Shells</button>' + tabs.map((t, i) => '<button class="tab' + (i === 0 ? ' on' : '') + '">zsh · ' + esc(t) + '</button>').join('') + '<button class="tab" disabled title="Design only">+</button></div><div class="term"><div class="sub">Plain shells live here, several at once, beside the agent sessions (ADR-0009). This page draws the drawer only; no shell runs.</div><div class="line"><b>' + esc(state.d.label) + ' %</b> <span class="cursor"></span></div></div>';
  el.querySelector('.toggle').addEventListener('click', () => el.classList.toggle('open'));
  for (const t of el.querySelectorAll('.tab:not([disabled])')) t.addEventListener('click', () => {
    for (const x of el.querySelectorAll('.tab')) x.classList.toggle('on', x === t);
    el.classList.add('open');
  });
}

// "Work on this" on a ticket's card opens a new session, its ticket's own action the first prompt.
const towersDrawCard = drawCard;
drawCard = function (id) {
  towersDrawCard(id);
  const acts = document.querySelector('#card .acts');
  acts?.insertAdjacentHTML('afterbegin', '<button data-act="work" class="work">▶ Work on this</button>');
  acts?.querySelector('[data-act="work"]').addEventListener('click', (e) => {
    e.stopPropagation();
    workOn(id);
  });
};

function workOn(id) {
  const r = state.ticketRow.get(id);
  if (!r) return;
  const first = r[NEEDS] && r[SAY] ? r[SAY] + ' (' + id + ')' : 'Work on ' + id + ': ' + r[TITLE];
  const el = document.getElementById('newsession');
  el.innerHTML = '<div class="dialog"><h2>New session · ' + esc(id) + '</h2><div class="sub">' + esc(r[TITLE]) + '</div>' +
    '<label>Agent</label><div class="seg"><button aria-pressed="true">✳ Claude</button><button aria-pressed="false">◎ Codex</button></div>' +
    '<label>Model</label><div class="seg"><button aria-pressed="true">Opus 5.5</button><button aria-pressed="false">Sonnet 5.5</button><button aria-pressed="false">Haiku 5.5</button></div>' +
    '<label>Effort</label><div class="seg"><button aria-pressed="false">low</button><button aria-pressed="false">medium</button><button aria-pressed="true">high</button><button aria-pressed="false">xhigh</button></div>' +
    '<label>Where</label><div class="seg"><button aria-pressed="true">A new worktree</button><button aria-pressed="false">This checkout</button></div>' +
    '<label>First prompt</label><div class="prompt">' + esc(first) + '</div>' +
    '<div class="acts"><button disabled title="Design only">Start</button><button data-close>Cancel</button></div></div>';
  el.hidden = false;
  for (const seg of el.querySelectorAll('.seg')) seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of seg.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  });
  el.querySelector('[data-close]').addEventListener('click', () => {
    el.hidden = true;
  });
  window.__towers.workOn = id;
}

// "? Marks" sits in the header, after the search box, and shows the legend the panels replace.
document.querySelector('header').appendChild(document.getElementById('marks-toggle'));
document.getElementById('marks-toggle').addEventListener('click', () => {
  if (state.sel === null && !state.session) document.getElementById('legend').classList.toggle('shown');
});

/** For the capture script and a check: open a session, start "Work on this", open the drawer. */
window.__agents = {
  sessions: () => state.d.agents.sessions.map((s) => ({ id: s.id, placed: state.orbs.has(s.id) })),
  open(id) {
    openSession(id);
    return { session: state.session, pane: document.getElementById('panel').textContent };
  },
  workOn(id) {
    select(id, { pane: false });
    workOn(id);
    return document.getElementById('newsession').textContent;
  },
  drawer(open) {
    document.getElementById('drawer').classList.toggle('open', open);
  },
  close() {
    document.getElementById('newsession').hidden = true;
    clearSelection();
    clearSelection();
  },
};
