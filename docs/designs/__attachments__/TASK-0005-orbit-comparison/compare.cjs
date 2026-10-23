// TASK-0005: capture the existing renderer; no treatment decision is made here.
// From desktop/: electron . --drive ../docs/designs/__attachments__/TASK-0005-orbit-comparison/compare.cjs --drive-out dist/task-0005/captures
const assert = require('node:assert/strict');
module.exports = async (d) => {
  const win = await d.open(`deck://${d.prepared.id}/issues?surface=orbit`, { width: 1440, height: 900 });
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) d.log('renderer', message); });
  const js = code => d.js(win, code);
  const graph = await (await fetch(`${d.origin}/deck/graph/${d.prepared.id}`)).json();
  d.log('Corpus', { nodes: graph.nodes.length, links: graph.edges.length });
  await js('window.__deckReducedMotion = true; window.__deckGlass.flyTo(0)');
  for (let i = 0; i < 80; i++) {
    if (await js('window.__deckGlass.canvasCounts().dots > 0')) break;
    await d.delay(250);
  }
  await d.delay(1000);
  const point = selector => js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  let baseline;
  for (const treatment of ['constellation', 'glass', 'blocks']) {
    const button = await point(`#treatments button[data-treatment="${treatment}"]`);
    assert.ok(button, `${treatment} control exists`);
    await d.pointer(win, d.click(button));
    await d.pointer(win, [{type:'move',x:10,y:10,wait:500}]);
    const state = await js(`(() => {
      const g = window.__deckGlass;
      return { surface: document.body.dataset.surface, treatment:g.getTreatment(), pressed:document.querySelector('#treatments [aria-pressed="true"]').dataset.treatment,
        label:document.getElementById('front-label').textContent, counts:g.canvasCounts(), yaw:g.model.yaw,
        slots:[...g.model.current.slots.keys()].sort(), dots:g.dots.map(p=>[p.id,p.x,p.y]).sort((a,b)=>a[0].localeCompare(b[0])) };
    })()`);
    assert.equal(state.surface,'orbit');
    assert.equal(state.treatment,treatment);
    assert.equal(state.pressed,treatment);
    assert.ok(state.counts.dots>0);
    assert.equal(state.slots.length,graph.nodes.length);
    if (baseline) {
      assert.deepEqual(state.slots,baseline.slots,'same corpus in every treatment');
      assert.deepEqual(state.dots,baseline.dots,'same projected notes and camera');
      assert.equal(state.yaw,baseline.yaw);
    } else baseline=state;
    if (treatment==='blocks') assert.equal(state.counts.edges,0);
    else assert.ok(state.counts.edges>0);
    d.log(treatment, {nodes:state.slots.length,visibleDots:state.counts.dots,visibleLinks:state.counts.edges,yaw:state.yaw,label:state.label});
    await d.shot(win,`orbit-${treatment}`);
  }
  // Inspect the existing replacement for the whole edge overlay in Blocks.
  const dot = await js('window.__deckGlass.dotSample()');
  assert.ok(dot,'a block is exposed to the pointer');
  const field = await js('(() => { const r=document.getElementById("field").getBoundingClientRect(); return {x:r.x,y:r.y}; })()');
  await d.pointer(win,[{type:'move',x:field.x+dot.x,y:field.y+dot.y,wait:1200}]);
  const reach = await js('window.__deckGlass.reaching()');
  d.log('Blocks hover', {target:dot.id,reach});
  await d.shot(win,'orbit-blocks-hover');
  const card = await js(`(() => {
    for (const e of document.querySelectorAll('.field-card')) {
      const r=e.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
      if (r.width>0 && r.height>0 && document.elementFromPoint(x,y)?.closest('.field-card')===e) return {id:e.dataset.noteId,x,y};
    }
    return null;
  })()`);
  assert.ok(card,'a near card is exposed to the pointer');
  await d.pointer(win,[{type:'move',x:card.x,y:card.y,wait:1800}]);
  const cardReach=await js('window.__deckGlass.reaching()');
  d.log('Blocks near-card hover',{target:card.id,reach:cardReach});
  assert.ok(cardReach && cardReach.neighbours.length>0,'near-card hover draws a neighbourhood');
  await d.shot(win,'orbit-blocks-card-hover');
  const constellation = await point('#treatments button[data-treatment="constellation"]');
  await d.pointer(win,d.click(constellation));
  await d.pointer(win,[{type:'move',x:10,y:10,wait:300}]);
  const edge=await js('window.__deckGlass.edgeSample()');
  assert.ok(edge,'an edge is exposed to the pointer');
  await d.pointer(win,[{type:'move',x:Math.round(field.x)+edge.x,y:Math.round(field.y)+edge.y,wait:1200}]);
  const callout=await js(`(() => {const e=document.getElementById('edge-callout');return {shown:!e.hidden,text:e.textContent};})()`);
  assert.ok(callout.shown && callout.text.includes(edge.source));
  d.log('Constellation link hover',{source:edge.source,target:edge.target,callout});
  await d.shot(win,'orbit-constellation-link-hover');
};
