// A quick look at the Glass desktop: the collection on the field, a row
// opened as a document, its details and its related list. For a developer;
// the recorded demonstration is demos/glass-desktop.cjs.
module.exports = async function (d) {
  const win = await d.open(`deck://${d.prepared.id}/issues`);
  const js = (code) => d.js(win, code);
  const rect = (sel) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, width: r.width, height: r.height }; })()`);
  await d.shot(win, '01-issues');
  d.log('collection', await js(`({ shown: !document.getElementById('collection').hidden, rect: (() => { const r = document.getElementById('collection').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })(), name: document.getElementById('collection-name').textContent, count: document.getElementById('collection-count').textContent, places: document.getElementById('collection-places').textContent, rows: document.querySelectorAll('#nav-list .nav-row:not([hidden])').length, field: (() => { const r = document.getElementById('field').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })(), navigatorIn: document.getElementById('navigator').parentElement.id })`));
  // Open the first note row.
  const row = await rect('#nav-list .nav-row:not([hidden])');
  await d.pointer(win, [...d.click(row), { type: 'move', x: row.x + 500, y: row.y + 300 }]);
  await d.delay(150);
  await d.shot(win, '02-opening');
  await d.delay(1300);
  await d.shot(win, '03-document');
  d.log('document', await js(`(() => { const p = document.querySelector('.pane'); if (!p) return null; const r = p.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], state: p.dataset.state, title: p.querySelector('.pane-title').textContent, id: p.querySelector('.pane-id').textContent, status: p.querySelector('.pane-status').textContent, subject: p.querySelector('.pane-subject').textContent, chars: p.querySelector('.pane-note').textContent.length, actions: p.querySelector('.pane-actions').textContent, focus: window.__deckGlass.focusId(), seated: window.__deckGlass.focusState().seated.length }; })()`));
  const info = await rect('.pane .pane-info');
  await d.pointer(win, d.click(info));
  await d.delay(300);
  const related = await rect('.pane .pane-related');
  await d.pointer(win, d.click(related));
  await d.delay(900);
  await d.shot(win, '04-details-and-related');
  d.log('details', await js(`document.querySelector('.pane .pane-details').textContent`));
  d.log('related rows', await js(`[...document.querySelectorAll('.pane .link-row')].slice(0, 12).map((r) => r.textContent)`));
};
