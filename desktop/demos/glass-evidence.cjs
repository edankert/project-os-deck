// Evidence beside the claim, walked with a real pointer and keyboard
// (FEAT-0024, ADR-0008): the tests that name a note and what is recorded for
// each, with where each fact comes from; the words for what is not recorded;
// a claim joined to the tests its own line names; the test note's own
// Evidence section; and the route to the original.
//
// Every expectation here is checked against the sources themselves, read by
// this script apart from the page: the frontmatter of the notes, and the
// ledger FILE on disk (not the sidecar's answer about it, which is what the
// page reads). It changes ONE note on disk (a date, to see the staleness
// rule), so it runs only on a throwaway copy:
//   bash tools/scripts/walk-in-a-box.sh glass-evidence --copy
const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib.cjs');

module.exports = async function (d) {
  const root = d.prepared.root;
  if (!/^\/tmp\/|^\/private\/tmp\//.test(root) || fs.existsSync(path.join(root, '.git'))) throw new Error(`this walk edits a note and runs only on a throwaway copy under /tmp, not on ${root}`);
  const ws = d.prepared.id;
  const win = await d.open(`deck://${ws}/features`);
  const t = lib(d, win);
  const { js, check, glass } = t;

  // Every file of the copy's notes, by its content: at the end, only what the walk itself edited may differ.
  const crypto = require('node:crypto');
  const fingerprint = () => {
    const out = new Map();
    const visit = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, e.name); if (e.isDirectory()) visit(full); else if (e.isFile()) out.set(path.relative(root, full), crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex')); } };
    visit(path.join(root, 'docs'));
    return out;
  };
  const filesAtStart = fingerprint();
  const edited = [];

  // Every request for the acceptance record, counted; and refused while `refuse` is set.
  const asked = [];
  let refuse = false;
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => {
    const is = /\/api\/cockpit\/acceptance(\?|$)/.test(details.url);
    if (is) asked.push(details.url.replace(/^.*\/api\/cockpit\//, ''));
    done({ cancel: is && refuse });
  });

  // ---- The sources, read by the walk itself ----
  const graph = await (await fetch(`${d.origin}/deck/graph/${ws}`)).json();
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const records = (await (await fetch(`${d.origin}/deck/records/${ws}`)).json()).records;
  const recordOf = new Map(records.filter((r) => r.id).map((r) => [r.id, r]));
  const tests = records.filter((r) => r.types.includes('test'));
  const testIds = new Set(tests.map((r) => r.id));
  const isTest = (id) => testIds.has(id);
  /** Whether a frontmatter value names a note: by its id, not followed by another digit, or by a link to its file's name. */
  const stemOf = (id) => String((recordOf.get(id) || {}).fileName || '').replace(/\.md$/, '');
  const escaped = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = (value, id) => [].concat(value === undefined || value === null ? [] : value).some((v) => new RegExp(`(^|[^A-Z0-9-])${escaped(id)}(?![0-9])`).test(String(v)) || (stemOf(id) !== '' && String(v).includes(`[[${stemOf(id)}`)));
  const PHRASE = { covers: 'its covers: names this note', tasks: 'its tasks: names this note', tests: "named in this note's tests:", verifies: "named in this note's verifies:" };
  /** The tests that name a note, from the frontmatter as written: the four keys and no other. */
  const verifying = (noteId) => {
    const out = new Map();
    const add = (id, key) => { if (id !== noteId) out.set(id, [...new Set([...(out.get(id) || []), key])].sort()); };
    for (const test of tests) for (const key of ['covers', 'tasks']) if (names(test.frontmatter[key], noteId)) add(test.id, key);
    const own = recordOf.get(noteId);
    if (own) for (const key of ['tests', 'verifies']) for (const test of tests) if (names(own.frontmatter[key], test.id)) add(test.id, key);
    return [...out].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, keys]) => ({ id, keys }));
  };
  // The ledger FILES. An entry with no mark is an invalidation; entries are read by date, ties by file order,
  // which is the sidecar's own rule. Where a platform has ONE file and no `excused` entry in it, what stands
  // for a check is simply its newest entry, and the walk works that out from the file. Where a platform's
  // record is several files (a sealed release and the open one), the sidecar combines them by rules that are
  // its own; there the walk asks the sidecar itself, apart from the page, and says so.
  const ledgerDir = path.join(root, 'docs', 'releases', 'ledgers');
  const ledgerFiles = fs.existsSync(ledgerDir) ? fs.readdirSync(ledgerDir).filter((f) => f.endsWith('.json')).sort() : [];
  const readLedgers = () => ledgerFiles.map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(ledgerDir, f), 'utf-8')) }));
  const ledgersAtStart = readLedgers();
  const sidecarSays = async (platform) => (await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/acceptance?platform=${platform}`)).json();
  const platforms = (await sidecarSays('all')).ledger_platforms;
  const fromFile = new Map();
  const answers = new Map();
  for (const platform of platforms) {
    const files = ledgersAtStart.filter((l) => l.platform === platform);
    const simple = files.length === 1 && files[0].entries.every((e) => e.mark !== 'excused');
    fromFile.set(platform, simple ? files[0].entries.map((e, i) => ({ ...e, i })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i)) : null);
    answers.set(platform, await sidecarSays(platform));
  }
  const rowsOfAnswer = (platform) => answers.get(platform).view.tiers.flatMap((tier) => tier.areas.flatMap((area) => area.items));
  /** Every event recorded for a check on a platform, oldest first. */
  const eventsOf = (id, platform) => {
    const entries = fromFile.get(platform);
    // An entry may spell its verdict `result`, which the sidecar reads as `mark`; an entry with neither is an invalidation.
    if (entries !== null) return entries.filter((e) => e.check === id).map((e) => ({ date: e.date, mark: e.mark || e.result || '', by: e.by || '', method: e.method || '', reason: e.reason || '', invalidatedBy: e.invalidated_by || '' }));
    return (answers.get(platform).view.history[id] || []).filter((e) => !e.platform || e.platform === platform).map((e) => ({ date: e.date, mark: e.mark || '', by: e.by || '', method: e.method || '', reason: e.reason || '', invalidatedBy: e.invalidated_by || '' })).reverse();
  };
  /** What stands for a check on a platform: a verdict, an invalidation, or nothing. */
  const standing = (id, platform) => {
    const events = eventsOf(id, platform);
    if (fromFile.get(platform) !== null) {
      const l = events[events.length - 1];
      if (l === undefined) return { kind: 'not-walked' };
      return l.mark === '' ? { kind: 'invalidated', ...l, before: events.slice().reverse().find((e) => e.mark !== '') } : { kind: 'verdict', ...l };
    }
    const row = rowsOfAnswer(platform).find((r) => r.id === id);
    if (row !== undefined && row.mark && row.mark !== 'todo') {
      const event = events.slice().reverse().find((e) => e.mark === row.mark && e.date === row.verdict_date) || events.slice().reverse().find((e) => e.mark === row.mark) || {};
      return { kind: 'verdict', mark: row.mark, date: row.verdict_date, reason: row.verdict_reason || '', method: row.verdict_method || event.method || '', by: event.by || '' };
    }
    const l = events[events.length - 1];
    if (l === undefined) return { kind: 'not-walked' };
    // The row says no verdict stands and the newest event is a verdict: one from an earlier release, or one that expired.
    return l.mark === '' ? { kind: 'invalidated', ...l, before: events.slice().reverse().find((e) => e.mark !== '') } : { kind: 'lapsed', ...l };
  };
  const verdictText = (v) => `${v.mark} on ${v.date}${v.by ? ` by ${v.by}` : ''}${v.method ? `, ${v.method}` : ''}${v.reason ? `: ${v.reason}` : ''}`;
  /** Whether what a row shows for one platform is what stands for it there. */
  const saysWhatStands = (fact, id, platform) => {
    const v = standing(id, platform);
    if (fact === undefined || fact.from !== ` · from the acceptance ledger (${platform})`) return false;
    if (v.kind === 'not-walked') return fact.text === 'not walked: no verdict is recorded';
    if (v.kind === 'lapsed') return fact.text === `no verdict stands. An earlier one, ${v.mark} on ${v.date}, is in the history.`;
    if (v.kind === 'verdict') return fact.text === verdictText(v);
    return fact.text.startsWith(`invalidated on ${v.date}${v.invalidatedBy ? ` by ${v.invalidatedBy}` : ''}`) && fact.text.endsWith('Not walked since.') && (!v.before || fact.text.includes(`The verdict before it, ${v.before.mark} on ${v.before.date}, no longer stands.`));
  };
  // Where the walk reads the file, the sidecar's answer is held to it as well: a payload whose fields were
  // renamed would otherwise read as "not walked" with nothing failing (RISK-0008).
  const disagree = [];
  for (const platform of platforms) {
    if (fromFile.get(platform) === null) continue;
    for (const row of rowsOfAnswer(platform)) {
      const v = standing(row.id, platform);
      const same = v.kind === 'verdict' ? row.mark === v.mark && row.verdict_date === v.date : !row.mark || row.mark === 'todo';
      if (!same) disagree.push([platform, row.id, row.mark, v.kind, v.mark || '']);
    }
  }
  d.log('the sources as the walk reads them', { notes: records.length, tests: tests.length, ledgerFiles, platforms, readFromTheFile: platforms.filter((p) => fromFile.get(p) !== null), askedOfTheSidecar: platforms.filter((p) => fromFile.get(p) === null), checks: platforms.map((p) => rowsOfAnswer(p).length), answerBytes: platforms.map((p) => JSON.stringify(answers.get(p)).length) });
  check(disagree.length === 0, 'for each platform whose ledger is one file, the sidecar\'s answer gives every check the verdict its newest entry in that file gives it', { platforms: platforms.filter((p) => fromFile.get(p) !== null), disagree: disagree.slice(0, 5) });

  const find = (id) => `[...document.querySelectorAll('.pane')].find((e) => e.dataset.noteId === ${JSON.stringify(id)})`;
  const panel = (id) =>
    js(`(() => { const p = ${find(id)}; if (!p) return null; const e = p.querySelector('.pane-evidence'); const tx = (n, s) => { const x = n.querySelector(s); return x ? x.textContent : ''; }; const b = p.querySelector('.pane-body').getBoundingClientRect(); const er = e.getBoundingClientRect(); return { note: p.dataset.noteId, open: !e.hidden, width: Math.round(p.getBoundingClientRect().width), beside: p.classList.contains('evidence-beside'), rightOfText: er.left >= b.right - 1, aboveText: er.bottom <= b.top + 1, control: p.querySelector('.pane-proof').textContent, controlSays: p.querySelector('.pane-proof').getAttribute('aria-label'), name: e.getAttribute('aria-label'), status: tx(e, '.evidence-status'), claim: tx(e, '.evidence-claim'), none: [...e.querySelectorAll('.evidence-none')].map((n) => n.textContent), unread: [...e.querySelectorAll('.evidence-unread')].map((n) => n.textContent), reading: /Reading what is recorded/.test(e.textContent), rows: [...e.querySelectorAll('.evidence-row')].map((r) => ({ id: r.dataset.noteId, titleFirst: r.querySelector('.evidence-head').firstElementChild.className === 'evidence-title', title: tx(r, '.evidence-title'), tone: r.dataset.tone, joined: tx(r, '.evidence-joined'), facts: [...r.querySelectorAll('.evidence-said')].map((f) => ({ label: tx(f, '.evidence-label'), text: tx(f, '.evidence-text'), from: tx(f, '.evidence-from'), colour: getComputedStyle(f.querySelector('.evidence-text')).color })), command: tx(r, '.evidence-command code'), history: [...r.querySelectorAll('.evidence-history li')].map((x) => x.textContent), excerpt: r.querySelector('.evidence-excerpt') ? r.querySelector('.evidence-excerpt').textContent : null, tools: [...r.querySelectorAll('.evidence-tools button')].map((x) => x.textContent), links: r.querySelectorAll('a').length })) }; })()`);
  const openNote = async (id) => {
    const s = await t.rect('#search');
    await d.pointer(win, d.click(s));
    await js(`(() => { const i = document.getElementById('search'); i.select(); })()`);
    for (const ch of id) { d.press(win, ch); await d.delay(25); }
    await d.delay(900);
    // A note held under another has its row under that one: open what is folded.
    for (let pass = 0; pass < 3; pass += 1) {
      const found = await js(`[...document.querySelectorAll('#nav-list .nav-row')].some((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(id)})`);
      if (found) break;
      await js(`(() => { const all = [...document.querySelectorAll('#nav-list > div')].filter((e) => !e.hidden); const from = all.findIndex((e) => e.dataset.groupKey && !e.dataset.groupKey.startsWith('g:deck:')); for (const r of all.slice(from)) { if (r.classList.contains('nav-group') && r.getAttribute('aria-expanded') === 'false') r.click(); else if (r.classList.contains('nav-row') && !r.querySelector('.nav-twist').hidden && r.getAttribute('aria-expanded') === 'false') r.querySelector('.nav-twist').click(); } })()`);
      await d.delay(700);
    }
    const row = await js(`(() => { const r = [...document.querySelectorAll('#nav-list .nav-row')].filter((r) => !r.hidden && r.dataset.noteId === ${JSON.stringify(id)}).pop(); if (!r) return null; r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(); const x = b.left + 140; const y = b.top + b.height / 2; return document.elementFromPoint(x, y)?.closest('.nav-row') === r ? { x, y } : null; })()`);
    if (!row) throw new Error(`${id} has no row to open in this view`);
    await d.pointer(win, d.click(row));
    await d.delay(1700);
    await t.park();
  };
  /** Press E on a document's header and wait for what is recorded to be read. */
  const evidenceOf = async (id) => {
    await js(`${find(id)}.querySelector('.pane-head').focus()`);
    d.press(win, 'e');
    for (let i = 0; i < 40; i += 1) { await d.delay(150); const p = await panel(id); if (p.open && !p.reading && (p.rows.length > 0 || p.none.length > 0)) return p; }
    return panel(id);
  };
  /** Press a control of one evidence row with the pointer. */
  const pressRow = async (docId, rowId, act, wait = 900) => {
    const at = await js(`(() => { const b = [...${find(docId)}.querySelectorAll('.evidence-row')].find((r) => r.dataset.noteId === ${JSON.stringify(rowId)}).querySelector('[data-act="${act}"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!at) throw new Error(`${rowId}'s row has no "${act}" control`);
    await d.pointer(win, d.click(at));
    await d.delay(wait);
  };
  /** Open a note from the list of what a document is joined to: how a person reaches a note no view lists. */
  const openFrom = async (docId, targetId) => {
    await js(`${find(docId)}.querySelector('.pane-head').focus()`);
    if (await js(`${find(docId)}.querySelector('.pane-links').hidden`)) { d.press(win, 'r'); await d.delay(900); }
    const at = await js(`(() => { const row = [...${find(docId)}.querySelectorAll('.link-row')].find((r) => r.dataset.noteId === ${JSON.stringify(targetId)}); if (!row) return null; const b = row.querySelector('.link-open'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!at) return false;
    await d.pointer(win, d.click(at));
    await d.delay(1800);
    await t.park();
    return (await js('window.__deckDesk()')).includes(targetId);
  };
  const close = (id, wait = 700) => t.clickOn(`.pane[data-note-id="${id}"] .pane-close`, wait);
  const sweep = async () => { await t.clickIfShown('#sweep-desk', 800); };
  // A fact's own colour says whether it holds the check open: the alarm colour, which no other fact has.
  const getTone = (row, fact) => (row.facts.indexOf(fact) === 0 ? row.tone : fact.colour === 'rgb(247, 118, 142)' ? 'blocking' : 'other');
  const fieldNow = () => js(`({ zoom: ${glass}.zoom(), yaw: ${glass}.model.yaw })`);

  // ---- 1. The header says how many tests name the note, and asks the sidecar for nothing ----
  const level = (id) => String(recordOf.get(id).frontmatter.level || '');
  const kindOf = (id) => (recordOf.get(id).status === 'retired' ? 'retired' : level(id) === 'acceptance' ? 'walked' : recordOf.get(id).frontmatter.command ? 'command' : 'hand');
  // The subject is the feature whose tests are of the most kinds (walked, run by a command, done by hand),
  // then the one with the most tests: chosen from the files, so the walk runs on any workspace.
  const SUBJECT = records
    .filter((r) => r.id && (nodes.get(r.id) || {}).type === 'feature' && r.status !== 'done')
    .map((r) => { const v = verifying(r.id).filter((x) => recordOf.get(x.id).status !== 'retired'); return { id: r.id, kinds: new Set(v.map((x) => kindOf(x.id))), n: v.length, walked: v.some((x) => kindOf(x.id) === 'walked') }; })
    .filter((f) => f.walked && f.n <= 40)
    .sort((a, b) => b.kinds.size - a.kinds.size || b.n - a.n || (a.id < b.id ? -1 : 1))[0].id;
  d.log('the subject', { id: SUBJECT, tests: verifying(SUBJECT).map((v) => [v.id, kindOf(v.id)]) });
  await openNote(SUBJECT);
  const want = verifying(SUBJECT);
  let p0 = await panel(SUBJECT);
  for (let i = 0; i < 30 && p0.control === 'evidence'; i += 1) { await d.delay(200); p0 = await panel(SUBJECT); }
  check(!p0.open && p0.control === `evidence · ${want.length}` && p0.controlSays === `Evidence: ${want.length} ${want.length === 1 ? 'test names' : 'tests name'} this note` && want.length >= 1 && asked.length === 0, `${SUBJECT} opens with its evidence closed and its text readable; the header's control says how many tests name it (${want.length}, as the frontmatter of the notes says), and the acceptance record has not been asked for`, { control: p0.control, says: p0.controlSays, open: p0.open, asked: [...asked] });

  // A requirement none of whose tests is walked by a person: its panel needs no ledger, and asks for none.
  const joined = await js(`${glass}.hooks.context(${JSON.stringify(SUBJECT)}).then((c) => [...new Set([...c.linked, ...c.backlinks].map((i) => i.id))])`);
  const unwalked = (id) => !isTest(id) && verifying(id).length > 0 && verifying(id).every((v) => level(v.id) !== 'acceptance');
  // From the subject's own list when one is there; else any such note this view has a row for.
  let unwalkedId = joined.find(unwalked) || null;
  if (unwalkedId !== null && !(await openFrom(SUBJECT, unwalkedId))) unwalkedId = null;
  if (unwalkedId === null) {
    // A task has no row of its own in this view: it is reached from its feature's list, as a person reaches it.
    const parentOf = (r) => (/[A-Z]+-\d+/.exec(String(r.frontmatter.parent || '')) || [])[0];
    const tasks = records.filter((r) => r.id && unwalked(r.id) && (nodes.get(r.id) || {}).type === 'task' && (nodes.get(parentOf(r)) || {}).type === 'feature');
    d.log('notes whose tests are all below acceptance level', tasks.map((r) => r.id));
    for (const r of tasks.reverse().slice(0, 4)) {
      if (parentOf(r) === SUBJECT) continue;
      const parent = parentOf(r);
      try {
        await openNote(parent);
        if (await openFrom(parent, r.id)) { unwalkedId = r.id; await close(parent); break; }
        await close(parent);
      } catch { /* its feature has no row in this view: try the next */ }
    }
  }
  if (unwalkedId !== null) {
    const pr = await evidenceOf(unwalkedId);
    check(pr.rows.length > 0 && JSON.stringify(pr.rows.map((r) => r.id)) === JSON.stringify(verifying(unwalkedId).map((v) => v.id)) && pr.unread.length === 0 && asked.length === 0, `${unwalkedId}, none of whose ${pr.rows.length} tests is walked by a person: its panel is drawn from Deck's index and the test notes, and the acceptance record is still not asked for`, { rows: pr.rows.map((r) => [r.id, r.joined]), asked: [...asked] });
    d.press(win, 'Escape'); await d.delay(300);
    await close(unwalkedId);
  } else {
    d.log('NOT RUN: this view has no row for a note whose tests are all below acceptance level');
  }

  // ---- 2. The panel: beside the text or above it, and a row for each test the files name ----
  const pressedAt = Date.now();
  const listWasOpen = await js(`!${find(SUBJECT)}.querySelector('.pane-links').hidden`);
  const p1narrow = await evidenceOf(SUBJECT);
  const tookMs = Date.now() - pressedAt;
  const roomLeft = await js(`(() => { const p = ${find(SUBJECT)}; return { listOpen: !p.querySelector('.pane-links').hidden, textHeight: Math.round(p.querySelector('.pane-body').getBoundingClientRect().height), documentHeight: Math.round(p.getBoundingClientRect().height) }; })()`);
  const layoutNarrow = { width: p1narrow.width, beside: p1narrow.beside, rightOfText: p1narrow.rightOfText, aboveText: p1narrow.aboveText };
  await d.shot(win, '01-evidence-in-a-document-at-its-own-size');
  await t.clickOn(`.pane[data-note-id="${SUBJECT}"] .pane-widen`, 700);
  const p1 = await panel(SUBJECT);
  const layoutWide = { width: p1.width, beside: p1.beside, rightOfText: p1.rightOfText, aboveText: p1.aboveText };
  const fits = (l) => (l.width >= 760 ? l.beside && l.rightOfText : !l.beside && l.aboveText);
  check(fits(layoutNarrow) && fits(layoutWide) && layoutWide.width >= 760, 'the panel is part of the document: beside the text when the document is at least 760 px wide, above it when it is narrower', { atItsOwnSize: layoutNarrow, fillingTheField: layoutWide, bothCasesSeen: layoutNarrow.width < 760 });
  check(p1narrow.width >= 760 || (!roomLeft.listOpen && roomLeft.textHeight >= roomLeft.documentHeight * 0.3), 'in a document too narrow to hold the evidence beside the text, the evidence takes the related list\'s place above the text, and the text keeps at least three tenths of the document', { listWasOpen, ...roomLeft });
  check(JSON.stringify(asked) === JSON.stringify(['acceptance?platform=all', ...platforms.map((p) => `acceptance?platform=${p}`)]), 'opening a panel that lists a check a person walks asks for the acceptance record: once for the list of platforms, then once for each, naming it', { asked: [...asked], tookMs });
  check(JSON.stringify(p1.rows.map((r) => r.id)) === JSON.stringify(want.map((v) => v.id)) && p1.rows.every((r, i) => r.titleFirst && r.title === recordOf.get(r.id).title && r.joined.startsWith(want[i].keys.map((k) => PHRASE[k]).join(' · '))), `a row for each of the ${want.length} tests whose frontmatter names ${SUBJECT}, and no other; each with its title before its id, and the key it was found under in the file's own word`, p1.rows.map((r) => [r.id, r.joined]));
  const ownStatus = recordOf.get(SUBJECT).status;
  check(p1.status === `${SUBJECT} is "${ownStatus}". That is its status, not a verdict.` && /^Evidence for /.test(p1.name), 'the note\'s own status is said first and apart, as a status and not a verdict; the panel has a name a screen reader says', { status: p1.status, name: p1.name });
  await d.shot(win, '02-evidence-beside-the-text');

  // Each row against the test's own frontmatter and the ledger file.
  const wrong = [];
  const kinds = { command: 0, hand: 0, walked: 0, retired: 0 };
  const plain = p1.rows.flatMap((r) => r.facts).filter((f) => f.label === '').map((f) => f.colour);
  for (const row of p1.rows) {
    const fm = recordOf.get(row.id).frontmatter;
    const verdicts = row.facts.filter((f) => f.label === 'verdict: ');
    const statuses = row.facts.filter((f) => f.label === 'status of the test note: ');
    if (kindOf(row.id) === 'retired') {
      // A retired test is still listed, because its frontmatter still names the note; it says it is retired and nothing else.
      kinds.retired += 1;
      if (row.facts.length !== 1 || row.facts[0].text !== 'retired: it is no longer performed' || row.facts[0].from !== ' · from the test note') wrong.push([row.id, row.facts]);
    } else if (fm.level === 'acceptance') {
      kinds.walked += 1;
      // One verdict line for each platform, in the order the record lists them, each naming its platform.
      const ok = verdicts.length === platforms.length && platforms.every((platform, i) => saysWhatStands(verdicts[i], row.id, platform));
      if (!ok || statuses.length !== 1 || statuses[0].text !== recordOf.get(row.id).status || statuses[0].from !== ' · from the test note' || !row.joined.endsWith('walked by a person')) wrong.push([row.id, row.facts, platforms.map((platform) => standing(row.id, platform))]);
    } else if (fm.command) {
      kinds.command += 1;
      const f = row.facts;
      if (f.length !== 1 || f[0].label !== '' || f[0].text !== 'run by a command; its result is not recorded anywhere Deck can read' || row.command !== String(fm.command) || row.tone !== 'plain' || /\d{4}-\d{2}-\d{2}/.test(f[0].text)) wrong.push([row.id, row.facts, row.command]);
    } else {
      kinds.hand += 1;
      const date = String(fm.last_verified || '').slice(0, 10);
      const expected = date === '' ? `${recordOf.get(row.id).status}; no date of verification is recorded on the test note` : `${recordOf.get(row.id).status}, last verified ${date}`;
      if (verdicts.length !== 0 || statuses.length !== 1 || !statuses[0].text.startsWith(expected) || statuses[0].from !== ' · from the test note') wrong.push([row.id, row.facts, expected]);
    }
  }
  const never = p1.rows.flatMap((r) => (kindOf(r.id) === 'walked' ? platforms.map((platform, i) => ({ id: r.id, platform, fact: r.facts.filter((f) => f.label === 'verdict: ')[i], stands: standing(r.id, platform).kind })) : [])).find((x) => x.stands === 'not-walked');
  if (never) check(never.fact !== undefined && never.fact.text === 'not walked: no verdict is recorded' && eventsOf(never.id, never.platform).length === 0, `${never.id} has no entry for ${never.platform} in the ledger, and its row reads "not walked: no verdict is recorded" whatever the test note's own status says`, { fact: never.fact, noteStatus: recordOf.get(never.id).status });
  else d.log('NOT RUN: every check a person walks on the subject has an entry in the ledger');
  const otherColours = new Set(p1.rows.flatMap((r) => r.facts).filter((f) => f.label !== '').map((f) => f.colour));
  check(wrong.length === 0 && kinds.walked > 0, 'each row says what its source records, under its own label: a check a person walks has a "verdict" from the acceptance ledger and, on a separate line, the "status of the test note"; a test done by hand has only its note\'s status and date; a test run by a command has the sentence and the command, with no verdict, no date and no mark', { kinds, platforms, wrong: wrong.slice(0, 3) });
  check(new Set(plain).size <= 1 && p1.rows.every((r) => r.links === 0), 'a row for a test run by a command is in the plain text colour, the same for every such row; and nothing in a row is a link to a file nothing serves', { commandRowColour: [...new Set(plain)], otherColours: [...otherColours] });

  // The wheel inside the panel is the panel's: at its end it does not turn or zoom the field.
  const er = await t.rect(`.pane[data-note-id="${SUBJECT}"] .pane-evidence`);
  const before = await fieldNow();
  for (let i = 0; i < 40; i += 1) { d.wheel(win, er.x, er.y, 240); await d.delay(12); }
  await d.delay(300);
  const scrolled = await js(`(() => { const e = ${find(SUBJECT)}.querySelector('.pane-evidence'); return { top: e.scrollTop, max: e.scrollHeight - e.clientHeight }; })()`);
  for (let i = 0; i < 12; i += 1) { d.wheel(win, er.x, er.y, 240); await d.delay(15); }
  for (let i = 0; i < 12; i += 1) { d.wheel(win, er.x, er.y, 240, ['shift']); await d.delay(15); }
  await d.delay(300);
  check((scrolled.max <= 0 || Math.abs(scrolled.top - scrolled.max) <= 1) && JSON.stringify(before) === JSON.stringify(await fieldNow()), 'the wheel over the panel scrolls the panel and, at its end, does not zoom or turn the field', { scrolled, before, after: await fieldNow() });
  const still = await js(`(() => { const s = getComputedStyle(${find(SUBJECT)}.querySelector('.pane-evidence')); return { transition: s.transitionDuration, animation: s.animationName }; })()`);
  check(still.transition === '0s' && still.animation === 'none', 'the panel appears and disappears in place: it has no transition and no animation, so there is no travel to remove under reduced motion', still);

  // ---- 3. The excerpt, the route to the original, and the way back to the row ----
  const hand = p1.rows.find((r) => kindOf(r.id) === 'hand') || null;
  const walked = p1.rows.find((r) => kindOf(r.id) === 'walked');
  const walkedWas = walked.facts.map((f) => f.text);
  const renderedOf = async (id) => (await (await fetch(`${d.origin}/deck/sidecar/${ws}/api/render?path=${encodeURIComponent(nodes.get(id).rel)}`)).json()).html;
  const hasSection = (html) => /<h[1-4][^>]*>\s*Evidence/.test(html);
  // Compared with the note as the sidecar renders it, tags and spacing aside.
  const squash = (x) => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, '');
  const withSection = [];
  const without = [];
  for (const row of p1.rows) (hasSection(await renderedOf(row.id)) ? withSection : without).push(row.id);
  const quotes = withSection.find((id) => hand !== null && id === hand.id) || withSection[0] || null;
  if (quotes !== null) {
    await pressRow(SUBJECT, quotes, 'excerpt', 1500);
    const withExcerpt = (await panel(SUBJECT)).rows.find((r) => r.id === quotes);
    const rendered = await renderedOf(quotes);
    const section = squash(rendered.slice(rendered.search(/<h[1-4][^>]*>\s*Evidence/)));
    const quoted = withExcerpt.excerpt === null ? '' : squash(withExcerpt.excerpt.replace(/^From [A-Z]+-\d+, under its "[^"]+" heading: /, '').replace(/… \(cut here; open the test note for the rest\)$/, ''));
    check(withExcerpt.excerpt !== null && withExcerpt.excerpt.startsWith(`From ${quotes}, under its "Evidence`) && quoted.length > 20 && section.includes(quoted.slice(0, 300)), `"Excerpt" on ${quotes}'s row quotes that note's own text from under its Evidence heading, and names the heading`, { excerpt: withExcerpt.excerpt && withExcerpt.excerpt.slice(0, 160) });
  } else {
    d.log('NOT RUN: none of the subject\'s tests has an Evidence section to quote');
  }
  if (without.length > 0) {
    await pressRow(SUBJECT, without[0], 'excerpt', 1500);
    const noSection = (await panel(SUBJECT)).rows.find((r) => r.id === without[0]);
    check(noSection.excerpt === 'this test note has no Evidence section', `${without[0]} has no Evidence section, and its row says so and quotes nothing from anywhere else in it`, noSection.excerpt);
  } else {
    d.log('NOT RUN: every one of the subject\'s tests has an Evidence section');
  }
  await d.shot(win, '03-the-evidence-section-and-its-absence');
  const original = quotes || p1.rows[0].id;
  await pressRow(SUBJECT, original, 'open', 2400);
  await t.park();
  // Where its Evidence heading stands: at the top of the document's text, or as near as the end of the text allows.
  const landedAt = (id) => js(`(() => { const p = ${find(id)}; const b = p.querySelector('.pane-body'); const h = [...p.querySelectorAll('.pane-note h1, .pane-note h2, .pane-note h3, .pane-note h4')].find((x) => /^evidence\\b/i.test(x.textContent.trim())); const below = h ? Math.round(h.getBoundingClientRect().top - b.getBoundingClientRect().top) : null; return { held: window.__deckDesk(), state: ${glass}.documentState(${JSON.stringify(id)}), heading: h ? h.textContent.trim() : null, headingBelowTop: below, inSight: below !== null && below >= -2 && below < b.clientHeight, atEnd: b.scrollHeight - b.clientHeight - b.scrollTop < 2, scrolled: Math.round(b.scrollTop) }; })()`);
  // At the top of the text, or, where the text ends before the heading can reach the top, in sight with the text at its end.
  const landed = (o) => o.headingBelowTop !== null && ((o.headingBelowTop >= -2 && o.headingBelowTop <= 24) || (o.atEnd && o.inSight));
  const openedTest = await landedAt(original);
  check(openedTest.held.includes(original) && openedTest.state === 'ready' && (quotes === null || landed(openedTest)), `"Open the test note" opens ${original} itself as a document${quotes === null ? '' : `, at its "${openedTest.heading}" heading`}: the route to the full original`, openedTest);
  await d.shot(win, '04-the-original-at-its-evidence-section');
  // A test note's own document has the control too, and its panel shows that test's own row.
  const pt = await evidenceOf(original);
  const ownRow = pt.rows[0];
  const othersNaming = verifying(original).length;
  check(pt.control === `evidence · this test${othersNaming === 0 ? '' : ` + ${othersNaming}`}` && ownRow !== undefined && ownRow.id === original && ownRow.joined.startsWith('this note') && !ownRow.tools.includes('Open the test note') && ownRow.facts.length > 0, `${original}'s own document has the control, and its panel's first row is that test itself, with no control to open what is already open`, { control: pt.control, row: ownRow && { id: ownRow.id, joined: ownRow.joined, tools: ownRow.tools } });
  d.press(win, 'Escape'); await d.delay(300);
  // Asked for again while it is on the desk: raised, not opened twice. (One document's evidence is open
  // at a time, so the subject's panel is opened again first.)
  await evidenceOf(SUBJECT);
  await pressRow(SUBJECT, original, 'open', 1800);
  await t.park();
  const twice = await js(`({ held: window.__deckDesk().filter((id) => id === ${JSON.stringify(original)}).length, panes: [...document.querySelectorAll('.pane')].filter((e) => e.dataset.noteId === ${JSON.stringify(original)}).length })`);
  await close(original, 900);
  const back = await js(`(() => { const a = document.activeElement; const row = a && a.closest ? a.closest('.evidence-row') : null; return { act: a ? a.dataset.act || a.className : null, row: row ? row.dataset.noteId : null, doc: a && a.closest ? (a.closest('.pane') || { dataset: {} }).dataset.noteId || null : null }; })()`);
  check(twice.held === 1 && twice.panes === 1 && back.act === 'open' && back.row === original && back.doc === SUBJECT, `asked for again while it is on the desk, ${original} is raised and not opened twice; closing it puts the keyboard back on the row it was opened from`, { twice, back });

  // ---- 4. Verdicts from the ledger: one that clears, one that holds the check open, one invalidated ----
  const subjectOf = (testId) => []
    .concat(recordOf.get(testId).frontmatter.covers || [])
    .map((v) => (/[A-Z]+-\d+/.exec(String(v)) || [])[0])
    .find((id) => id && (nodes.get(id) || {}).type === 'feature' && verifying(id).length <= 40);
  const walkedChecks = tests.filter((r) => level(r.id) === 'acceptance' && r.status !== 'retired' && subjectOf(r.id)).map((r) => r.id);
  const example = (test) => { for (const platform of platforms) { const id = walkedChecks.find((c) => test(standing(c, platform))); if (id) return { id, platform }; } return null; };
  const cases = [
    ['a check that passed', example((v) => v.kind === 'verdict' && v.mark === 'pass')],
    ['a check held open', example((v) => v.kind === 'verdict' && ['question', 'fail', 'blocked'].includes(v.mark))],
    ['a check whose verdict was invalidated', example((v) => v.kind === 'invalidated')],
  ];
  await sweep();
  let passColour = null;
  for (const [what, found] of cases) {
    if (!found) { d.log(`NOT RUN: this workspace's ledger holds no example of ${what} on a feature this view lists`); continue; }
    const { id, platform } = found;
    const subject = subjectOf(id);
    try { await openNote(subject); } catch { d.log(`NOT RUN: ${subject}, which ${id} covers, has no row in this view (${what})`); continue; }
    await t.clickOn(`.pane[data-note-id="${subject}"] .pane-widen`, 400);
    const p = await evidenceOf(subject);
    const row = p.rows.find((r) => r.id === id);
    const verdict = row === undefined ? undefined : row.facts.find((f) => f.label === 'verdict: ' && f.from === ` · from the acceptance ledger (${platform})`);
    const v = standing(id, platform);
    if (what === 'a check that passed') {
      check(verdict !== undefined && verdict.text === verdictText(v) && saysWhatStands(verdict, id, platform), `${id} on ${subject}: the verdict that stands on ${platform}, its date, who recorded it and how, named as coming from the acceptance ledger`, row && row.facts);
      passColour = verdict === undefined ? null : verdict.colour;
      await pressRow(subject, id, 'history', 500);
      const h = (await panel(subject)).rows.find((r) => r.id === id).history;
      const all = platforms.flatMap((pf) => eventsOf(id, pf).map((e) => ({ ...e, platform: pf })));
      const lines = all.map((e) => `${e.platform}, ${e.date}: ${e.mark ? e.mark : `invalidated${e.invalidatedBy ? ` by ${e.invalidatedBy}` : ''}`}`);
      const dates = h.map((line) => (/, (\d{4}-\d{2}-\d{2}): /.exec(line) || [])[1]);
      check(h.length === all.length && lines.every((line) => h.some((x) => x.startsWith(line))) && dates.every((date, i) => i === 0 || dates[i - 1] >= date) && row.tools.includes(`History (${all.length})`), `"History" lists all ${all.length} events recorded for it, newest first, each with its platform, date and mark`, h.map((line) => line.slice(0, 140)));
      await d.shot(win, '05-a-verdict-and-its-history');
      // This test note's Evidence heading may be the template's longer one, "Evidence (fill after running)".
      await pressRow(subject, id, 'open', 2400);
      await t.park();
      const there = await landedAt(id);
      if (there.heading === null) d.log(`NOT RUN: ${id} has no Evidence heading to open at`);
      else check(there.held.includes(id) && there.state === 'ready' && landed(there), `"Open the test note" on ${id} lands at its "${there.heading}" heading, found by how the heading begins`, there);
      // The test note is closed again, so the next case opens its own subject with the list clear.
      await close(id);
    } else if (what === 'a check held open') {
      check(saysWhatStands(verdict, id, platform) && (!v.reason || verdict.text.endsWith(`: ${v.reason}`)) && getTone(row, verdict) === 'blocking', `${id} on ${subject}: a verdict that holds the check open on ${platform} is shown as that, with the walker's reason`, row && row.facts);
    } else {
      check(saysWhatStands(verdict, id, platform) && passColour !== verdict.colour, `${id} on ${subject}: an invalidated verdict is not shown as the pass it replaced. The row says what invalidated it and when, and that the earlier verdict no longer stands`, row && row.facts);
      await d.shot(win, '06-an-invalidated-verdict');
    }
    await close(subject);
  }

  // ---- 5. A claim, and the tests its own line names; by keyboard ----
  await sweep();
  // A requirement whose criteria name tests on their own lines, and a feature that links to it: no view
  // lists a requirement, so it is opened from that feature's list, as a person opens it.
  let req2 = null;
  for (const r of records.filter((x) => x.id && (nodes.get(x.id) || {}).type === 'requirement').slice(0, 60)) {
    const html = await renderedOf(r.id);
    if (!/class="task-list-item"[^\n]*<a href="\/docs\/[^"]*TST-\d+/.test(html)) continue;
    const from = graph.edges.map((e) => (e.source === r.id ? e.target : e.target === r.id ? e.source : null)).find((id) => id && (nodes.get(id) || {}).type === 'feature');
    if (!from) continue;
    try { await openNote(from); } catch { continue; }
    if (await openFrom(from, r.id)) { req2 = r.id; break; }
    await sweep();
  }
  if (req2) {
    await t.clickOn(`.pane[data-note-id="${req2}"] .pane-widen`, 600);
    let claims = [];
    for (let i = 0; i < 20; i += 1) {
      claims = await js(`(() => { const p = ${find(req2)}; const lines = [...p.querySelectorAll('.pane-note li')].filter((li) => [...li.querySelectorAll('input[type=checkbox]')].some((b) => b.closest('li') === li)); return lines.map((li) => { const box = li.querySelector('input[type=checkbox]'); const c = li.querySelector('.claim-evidence'); return { text: li.textContent.slice(0, 70), links: [...li.querySelectorAll('a')].map((a) => decodeURIComponent((a.getAttribute('href') || '').replace(/^\\/docs\\//, '').split('#')[0])), control: c ? c.textContent : null, isButton: c ? c.tagName === 'BUTTON' && c.tabIndex === 0 : null, wrapsBox: c ? c.contains(box) : null, raw: box.dataset.raw || '' }; }); })()`);
      if (claims.some((c) => c.control !== null)) break;
      await d.delay(300);
    }
    const byRel = new Map(graph.nodes.map((n) => [n.rel, n.id]));
    for (const c of claims) c.tests = [...new Set(c.links.map((rel) => byRel.get(rel)).filter((id) => id && isTest(id)))];
    const naming = claims.filter((c) => c.tests.length > 0);
    check(claims.length > 0 && naming.length > 0 && claims.every((c) => (c.control !== null) === (c.tests.length > 0)) && naming.every((c) => c.control === 'evidence named on this line' && c.isButton && !c.wrapsBox && c.raw.length > 20), `${req2}: every criterion whose own line links a test note has a control reading "evidence named on this line", and a criterion that links none has none; the control is a button beside the line, and the line's checkbox and its raw text are as they were`, { criteria: claims.length, naming: naming.length, sample: claims.slice(0, 2).map((c) => ({ text: c.text, tests: c.tests, control: c.control })) });
    // By keyboard: focus goes to the control, Enter opens the panel for that line, Escape goes back to the control.
    await js(`(() => { const c = ${find(req2)}.querySelector('.claim-evidence'); c.scrollIntoView({ block: 'center' }); c.focus(); })()`);
    d.press(win, 'Return');
    let pc = await panel(req2);
    for (let i = 0; i < 30 && (!pc.open || pc.claim === '' || pc.rows.length === 0 || pc.reading); i += 1) { await d.delay(150); pc = await panel(req2); }
    const picked = await js(`document.querySelectorAll('.pane-note li.claim-picked').length`);
    check(pc.open && /^For the claim "/.test(pc.claim) && JSON.stringify(pc.rows.map((r) => r.id)) === JSON.stringify(naming[0].tests) && pc.rows.every((r) => r.joined.startsWith('named on this line')) && picked === 1, 'Enter on a criterion\'s control puts beside that claim exactly the tests its line names, each said to be "named on this line", and marks the claim', { claim: pc.claim.slice(0, 120), rows: pc.rows.map((r) => [r.id, r.joined]), picked });
    await d.shot(win, '07-evidence-beside-one-claim');
    d.press(win, 'Escape');
    await d.delay(400);
    const afterEsc = await js(`({ open: !${find(req2)}.querySelector('.pane-evidence').hidden, held: window.__deckDesk().length, active: document.activeElement.className, onFirst: document.activeElement === ${find(req2)}.querySelector('.claim-evidence') })`);
    check(!afterEsc.open && afterEsc.held === 2 && afterEsc.onFirst, 'Escape closes the panel and nothing else, and the keyboard is back on the criterion\'s control that opened it', afterEsc);
    // E on the header opens the panel and puts the keyboard in it; E pressed there closes it again.
    await js(`${find(req2)}.querySelector('.pane-head').focus()`);
    d.press(win, 'e');
    await d.delay(700);
    const eOpened = await js(`({ open: !${find(req2)}.querySelector('.pane-evidence').hidden, inPanel: !!document.activeElement.closest('.pane-evidence') })`);
    d.press(win, 'e');
    await d.delay(500);
    const eClosed = await js(`({ open: !${find(req2)}.querySelector('.pane-evidence').hidden, on: document.activeElement.className, held: window.__deckDesk().length })`);
    check(eOpened.open && eOpened.inPanel && !eClosed.open && /pane-proof/.test(eClosed.on) && eClosed.held === 2, 'E on the header opens the panel with the keyboard in it, and E pressed in the panel closes it and puts the keyboard on the header\'s evidence control', { eOpened, eClosed });
    // Space on the header's control opens the whole note's panel; Tab goes through its rows; Escape goes back to that control.
    await js(`${find(req2)}.querySelector('.pane-proof').focus()`);
    d.press(win, ' ');
    let pa = await panel(req2);
    for (let i = 0; i < 30 && (!pa.open || pa.claim !== '' || pa.rows.length === 0 || pa.reading); i += 1) { await d.delay(150); pa = await panel(req2); }
    const order = [];
    await js(`${find(req2)}.querySelector('.pane-evidence').focus()`);
    for (let i = 0; i < 4; i += 1) { d.press(win, 'Tab'); await d.delay(150); order.push(await js(`(() => { const a = document.activeElement; const row = a.closest('.evidence-row'); return (row ? row.dataset.noteId + ':' : '') + (a.dataset.act || a.className); })()`)); }
    const firstRow = pa.rows[0];
    check(pa.open && pa.claim === '' && JSON.stringify(pa.rows.map((r) => r.id)) === JSON.stringify(verifying(req2).map((v) => v.id)) && firstRow !== undefined && JSON.stringify(order.slice(0, 3)) === JSON.stringify(['again', `${firstRow.id}:open`, `${firstRow.id}:excerpt`]), 'Space on the header\'s control opens every test the files join to the requirement, and Tab goes through the panel in order: "read again", then each row\'s controls', { rows: pa.rows.map((r) => r.id), order });
    // Still by keyboard alone: the excerpt, the history where there is one, the original, and back to the row.
    const focusNow = () => js(`(() => { const a = document.activeElement; const row = a.closest ? a.closest('.evidence-row') : null; return (row ? row.dataset.noteId + ':' : '') + (a.dataset ? a.dataset.act || a.className : ''); })()`);
    const tabTo = async (target, limit = 40) => { for (let i = 0; i < limit; i += 1) { if ((await focusNow()) === target) return true; d.press(win, 'Tab'); await d.delay(120); } return (await focusNow()) === target; };
    await js(`${find(req2)}.querySelector('.pane-evidence').focus()`);
    const onExcerpt = await tabTo(`${firstRow.id}:excerpt`);
    d.press(win, 'Return');
    await d.delay(1500);
    const keyed = { onExcerpt, excerpt: ((await panel(req2)).rows[0].excerpt || '').slice(0, 60), focusAfterExcerpt: await focusNow() };
    const withHistory = pa.rows.find((r) => r.tools.some((x) => /^History/.test(x)));
    if (withHistory) {
      keyed.onHistory = await tabTo(`${withHistory.id}:history`);
      d.press(win, 'Return');
      await d.delay(500);
      keyed.history = (await panel(req2)).rows.find((r) => r.id === withHistory.id).history.length;
      keyed.focusAfterHistory = await focusNow();
    }
    const second = pa.rows[1] || pa.rows[0];
    await js(`${find(req2)}.querySelector('.pane-evidence').focus()`);
    keyed.onOpen = await tabTo(`${second.id}:open`);
    d.press(win, 'Return');
    await d.delay(2400);
    keyed.opened = (await js('window.__deckDesk()')).includes(second.id);
    keyed.keyboardIn = await js(`(document.activeElement.closest('.pane') || { dataset: {} }).dataset.noteId || null`);
    d.press(win, 'Delete');
    await d.delay(900);
    keyed.closed = !(await js('window.__deckDesk()')).includes(second.id);
    keyed.focusAfterClose = await focusNow();
    check(keyed.onExcerpt && keyed.excerpt.length > 0 && keyed.focusAfterExcerpt === `${firstRow.id}:excerpt` && (!withHistory || (keyed.onHistory && keyed.history > 0 && keyed.focusAfterHistory === `${withHistory.id}:history`)) && keyed.onOpen && keyed.opened && keyed.keyboardIn === second.id && keyed.closed && keyed.focusAfterClose === `${second.id}:open`, 'by keyboard alone: Enter on "Excerpt" shows the excerpt and the keyboard stays on that control; the same for "History" where a row has one; Enter on "Open the test note" opens the original with the keyboard in it; Delete closes it and the keyboard is back on the row it was opened from', keyed);
    d.press(win, 'Escape');
    await d.delay(400);
    const afterEsc2 = await js(`({ open: !${find(req2)}.querySelector('.pane-evidence').hidden, active: document.activeElement.className })`);
    check(!afterEsc2.open && /pane-proof/.test(afterEsc2.active), 'Escape there closes the panel and puts the keyboard back on the header\'s control', afterEsc2);
    await close(req2);
  } else {
    d.log('NOT RUN: no requirement whose criteria name a test on their own line could be opened from a feature\'s list');
  }

  // ---- 6. A note no test names ----
  // A note no test names, and one that is finished when there is one: its status is the thing nothing may be inferred from.
  const TERMINAL = ['done', 'accepted', 'implemented', 'fixed', 'closed', 'mitigated'];
  const bares = joined.filter((id) => !isTest(id) && recordOf.has(id) && verifying(id).length === 0 && ['feature', 'design', 'adr', 'decision', 'change', 'reference', 'risk', 'issue'].includes((nodes.get(id) || {}).type));
  const bareId = bares.find((id) => TERMINAL.includes(recordOf.get(id).status)) || bares[0] || null;
  await sweep();
  await openNote(SUBJECT);
  if (bareId !== null && (await openFrom(SUBJECT, bareId))) {
    let pb0 = await panel(bareId);
    for (let i = 0; i < 20 && pb0.control === 'evidence'; i += 1) { await d.delay(200); pb0 = await panel(bareId); }
    const pb = await evidenceOf(bareId);
    check(pb0.control === 'evidence · no test' && pb0.controlSays === 'Evidence: no test names this note' && pb.rows.length === 0 && pb.none.length === 1 && pb.none[0] === 'no test names this note. Nothing is inferred from its status.' && pb.status.includes('That is its status, not a verdict.'), `${bareId}, which no test names and whose status is "${recordOf.get(bareId).status}": the control and the panel both say "no test names this note", with no count, and nothing is inferred from that status`, { control: pb0.control, status: pb.status, none: pb.none });
    await d.shot(win, '08-a-note-no-test-names');
    await close(bareId);
  } else {
    d.log('NOT RUN: the subject is joined to no design, decision, change, reference or risk note that no test names');
  }

  // ---- 7. The staleness rule, on a date changed in the copy ----
  if (!(await js('window.__deckDesk()')).includes(SUBJECT)) await openNote(SUBJECT);
  await t.clickOn(`.pane[data-note-id="${SUBJECT}"] .pane-widen`, 400);
  // Two criteria written as plain bullets are added to the subject in the copy, one that links a test and one that links none.
  {
    const file = path.join(root, 'docs', nodes.get(SUBJECT).rel);
    const linkTo = path.basename(nodes.get(want[0].id).rel, '.md');
    fs.writeFileSync(file, `${fs.readFileSync(file, 'utf-8').trimEnd()}\n\n## Acceptance criteria the walk added\n\n- Added by the walk: this line links [[${linkTo}]].\n- Added by the walk: this line links no test.\n`);
    edited.push(path.relative(root, file));
    let crit = [];
    for (let i = 0; i < 40; i += 1) {
      await d.delay(400);
      crit = await js(`(() => { const p = ${find(SUBJECT)}; const lis = [...p.querySelectorAll('.pane-note li')].filter((li) => /^Added by the walk/.test(li.textContent.trim())); return lis.map((li) => ({ text: li.textContent.trim().slice(0, 48), control: (li.querySelector('.claim-evidence') || {}).textContent || null, box: !!li.querySelector('input[type=checkbox]') })); })()`);
      if (crit.length === 2 && crit[0].control !== null) break;
    }
    check(crit.length === 2 && crit[0].control === 'evidence named on this line' && !crit[0].box && crit[1].control === null && !crit[1].box, 'a criterion written as a plain bullet, under a heading that says "criteria", has the control when its line links a test note and none when it links none (two lines the walk added to the subject in the copy)', crit);
  }
  const factOf = (p, id, label) => { const row = p.rows.find((r) => r.id === id); return row === undefined ? undefined : row.facts.find((f) => f.label === label); };
  if (hand !== null && /^last_verified:/m.test(fs.readFileSync(path.join(root, 'docs', nodes.get(hand.id).rel), 'utf-8'))) {
    const file = path.join(root, 'docs', nodes.get(hand.id).rel);
    const text = fs.readFileSync(file, 'utf-8');
    fs.writeFileSync(file, text.replace(/^last_verified:.*$/m, 'last_verified: 2026-06-01'));
    edited.push(path.relative(root, file));
    await d.delay(3500);
    let stale;
    for (let i = 0; i < 20; i += 1) { const p = await evidenceOf(SUBJECT); stale = factOf(p, hand.id, 'status of the test note: '); if (stale && /stale/.test(stale.text)) break; d.press(win, 'Escape'); await d.delay(700); }
    const days = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse('2026-06-01')) / 86400000);
    const staleRow = (await panel(SUBJECT)).rows.find((r) => r.id === hand.id);
    check(stale !== undefined && stale.text === `${recordOf.get(hand.id).status}, last verified 2026-06-01. stale: a manual verification goes stale after 90 days; this was ${days} days ago` && staleRow.tone === 'stale' && stale.from === ' · from the test note', `with ${hand.id}'s date set to 2026-06-01 in the copy, its row says it is stale, names the rule and says how long ago; Deck worked that out from the date on the test note`, stale);
    await d.shot(win, '09-a-stale-verification');
  } else {
    d.log('NOT RUN: the subject has no test done by hand with a date to make stale');
    await evidenceOf(SUBJECT);
  }

  // ---- 8. The acceptance record cannot be read: said once, and not taken for "not walked" ----
  refuse = true;
  const readAgain = async () => {
    await js(`${find(SUBJECT)}.querySelector('.evidence-again').scrollIntoView({ block: 'center' })`);
    await d.delay(200);
    await t.clickOn(`.pane[data-note-id="${SUBJECT}"] .evidence-again`, 400);
    let p = await panel(SUBJECT);
    for (let i = 0; i < 40 && (p.reading || p.rows.length === 0); i += 1) { await d.delay(150); p = await panel(SUBJECT); }
    return p;
  };
  const pu = await readAgain();
  const unreadVerdict = factOf(pu, walked.id, 'verdict: ');
  const unaffected = pu.rows.filter((r) => kindOf(r.id) !== 'walked');
  check(pu.unread.length === 1 && /^the acceptance record could not be read: .+/.test(pu.unread[0]) && unreadVerdict !== undefined && unreadVerdict.text === 'the acceptance record could not be read' && unaffected.length === kinds.command + kinds.hand + kinds.retired && pu.rows.filter((r) => kindOf(r.id) === 'walked').every((r) => r.facts.filter((f) => f.label === 'verdict: ').length === 1) && unaffected.every((r) => r.facts.every((f) => !/could not be read/.test(f.text))), 'with the request for the acceptance record refused, the panel says once that it could not be read and why; the check a person walks says that in place of a verdict, and is not said to be "not walked"; the rows that need no ledger are still shown', { unread: pu.unread, verdict: unreadVerdict, unaffected: unaffected.length });
  await d.shot(win, '10-the-acceptance-record-could-not-be-read');
  refuse = false;
  // "read again" reads it again, now that the record answers.
  const again = (await readAgain()).rows.find((r) => r.id === walked.id);
  check(again !== undefined && JSON.stringify(again.facts.map((f) => f.text)) === JSON.stringify(walkedWas), '"read again" reads the record again, and the check has its own words back', again && again.facts.map((f) => f.text));

  // ---- With reduced motion asked for: the panel is there at once and does not travel ----
  d.press(win, 'Escape'); await d.delay(400);
  let reduced = null;
  try {
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await d.delay(300);
    await js(`${find(SUBJECT)}.querySelector('.pane-head').focus()`);
    d.press(win, 'e');
    await d.delay(60);
    const at = () => js(`(() => { const e = ${find(SUBJECT)}.querySelector('.pane-evidence'); const r = e.getBoundingClientRect(); return { open: !e.hidden, left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), opacity: getComputedStyle(e).opacity }; })()`);
    const first = await at();
    await d.delay(500);
    const later = await at();
    reduced = { asked: await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`), first, later };
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [] });
    win.webContents.debugger.detach();
  } catch (err) {
    d.log(`NOT RUN: reduced motion could not be emulated in this build (${err.message})`);
  }
  if (reduced !== null) check(reduced.asked && reduced.first.open && reduced.first.opacity === '1' && reduced.first.left === reduced.later.left && reduced.first.top === reduced.later.top && reduced.first.width === reduced.later.width, 'with reduced motion asked for, the panel is in its place at once, whole, and does not move after', reduced);
  if (!(await panel(SUBJECT)).open) await evidenceOf(SUBJECT);

  // ---- 9. Nothing here writes, and the served page reads the same ----
  const controls = await js(`({ buttons: [...new Set([...document.querySelectorAll('.pane-evidence button')].map((b) => b.textContent))], verbs: document.querySelectorAll('.pane-evidence .verb, .pane-evidence .tick, .pane-evidence input, .pane-evidence select, .pane-evidence textarea').length })`);
  const marked = await fetch(`${d.origin}/deck/sidecar/${ws}/api/cockpit/acceptance?platform=${platforms[0]}`, { method: 'POST', body: '{}' });
  const markCheck = await fetch(`${d.origin}/deck/sidecar/${ws}/api/notes/mark-check`, { method: 'POST', body: '{}' });
  check(controls.verbs === 0 && controls.buttons.every((b) => /^(Open the test note|Excerpt|History \(\d+\)|show every test for this note|read again)$/.test(b)) && marked.status === 405 && markCheck.status === 405 && JSON.stringify(readLedgers()) === JSON.stringify(ledgersAtStart), `the panel holds no control that records, changes or re-runs anything; Deck's host answers 405 to a write on the acceptance record; and the ${ledgerFiles.length} ledger ${ledgerFiles.length === 1 ? 'file is' : 'files are'}, entry for entry, what ${ledgerFiles.length === 1 ? 'it was' : 'they were'} when the walk began`, { buttons: controls.buttons, posts: [marked.status, markCheck.status] });
  const page = d.openServedPage();
  page.showInactive();
  await new Promise((resolve) => page.webContents.once('did-finish-load', resolve));
  await d.delay(4000);
  await d.js(page, `[...document.querySelectorAll('#switcher button')].find((x) => x.dataset.viewId === 'features').click()`);
  await d.delay(2500);
  const servedPane = await d.js(page, `(() => { const p = ${find(SUBJECT)}; if (!p) return null; p.querySelector('.pane-proof').click(); return p.querySelector('.pane-proof').textContent; })()`);
  for (let i = 0; i < 40; i += 1) { await d.delay(300); if (await d.js(page, `(() => { const p = ${find(SUBJECT)}; return p && p.querySelectorAll('.evidence-row').length > 0; })()`)) break; }
  const rowsOf = `[...${find(SUBJECT)}.querySelectorAll('.evidence-row')].map((r) => [r.dataset.noteId, r.querySelector('.evidence-joined').textContent, [...r.querySelectorAll('.evidence-said')].map((f) => f.textContent)])`;
  const served = servedPane ? await d.js(page, `({ bridge: typeof window.deck, rows: ${rowsOf} })`) : null;
  if (served) {
    await d.js(page, `[...${find(SUBJECT)}.querySelectorAll('.evidence-row')].find((r) => r.dataset.noteId === ${JSON.stringify(walked.id)}).querySelector('[data-act="excerpt"]').click()`);
    for (let i = 0; i < 20 && !served.excerpt; i += 1) { await d.delay(300); served.excerpt = await d.js(page, `(() => { const r = [...${find(SUBJECT)}.querySelectorAll('.evidence-row')].find((r) => r.dataset.noteId === ${JSON.stringify(walked.id)}); const q = r.querySelector('.evidence-excerpt'); return q ? q.textContent : null; })()`); }
  }
  const walkedExcerpt = without.includes(walked.id) ? 'this test note has no Evidence section' : null;
  const here = await js(rowsOf);
  check(served !== null && served.bridge === 'undefined' && servedPane === `evidence · ${want.length}` && JSON.stringify(served.rows) === JSON.stringify(here) && (walkedExcerpt === null ? typeof served.excerpt === 'string' && served.excerpt.startsWith(`From ${walked.id}, under its "Evidence`) : served.excerpt === walkedExcerpt), 'the served page, which has no bridge, shows the same control, the same rows with the same words, and the excerpt: evidence is read, and reading is all a tablet does', { control: servedPane, served: served && served.rows.length, here: here.length, excerpt: served && served.excerpt && served.excerpt.slice(0, 80) });
  page.destroy();
  win.webContents.session.webRequest.onBeforeRequest(null);
  const filesAtEnd = fingerprint();
  const differ = [...new Set([...filesAtStart.keys(), ...filesAtEnd.keys()])].filter((f) => filesAtStart.get(f) !== filesAtEnd.get(f)).sort();
  check(JSON.stringify(differ) === JSON.stringify(edited.slice().sort()), `of the copy's ${filesAtStart.size} files under docs, the only ones that differ from the start are the ones the walk edited itself (${edited.length})`, { differ, edited });

  d.log('what this walk does not establish', [
    'whether a person finds the evidence where they look for it, or trusts what it says: that is the acceptance check, walked by a person',
    'a result for a test run by a command: no source Deck can read records one, so there is nothing to check it against',
    'a capture or a ledger evidence reference: this workspace has none, and no read route gives them',
    ...(platforms.length === 1 ? ['more than one ledger platform: this workspace has one'] : []),
    ...(platforms.some((pf) => fromFile.get(pf) === null) ? ['the sidecar\'s own rule for combining a sealed release\'s ledger with the open one: where a platform has several ledger files the walk held the panel to the sidecar\'s answer, not to the files'] : []),
    'a screen reader, and touch',
  ]);
  t.finish();
};
