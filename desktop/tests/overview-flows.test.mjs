import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';
const F=load('shared/overview-flows.js'), {checkScene}=load('shared/overview-checks.js'), {plainContext,walkScene,sceneToSvg}=load('shared/overview-scene.js');
const json=f=>JSON.parse(fs.readFileSync(path.join(desktopRoot,'fixtures/overview',f),'utf8')), ctx=plainContext('abcd1234','features');
const look=s=>{for(const c of checkScene(s))assert.ok(c.ok,`${c.rule}: ${c.detail}`);assert.ok(sceneToSvg(s).includes('<svg'));};
for(const ws of ['deck','your-trainer']) {
 test(`${ws}: scenes, every platform section and More pass the look`,()=>{
  const m=json(ws+'.json'),d=json(`flows/${ws}-design.json`),r=json(`flows/${ws}-test-run.json`),a=json(`flows/${ws}-accept.json`);
  look(F.designScene(m,d,ctx));look(F.testRunScene(m,r,ctx));look(F.acceptScene(m,a,ctx));
  for(const p of r.platforms)for(const s of p.sections)look(F.testRunScene(m,{...r,step:`${p.id}.${s.number}`,open:s.checks[0]?.key,more:true},ctx));
  assert.equal([...walkScene(F.testRunScene(m,r,ctx).nodes)].filter(n=>n.tag==='circle'&&n.action?.startsWith('check:')).length,r.platforms.flatMap(p=>p.sections.flatMap(s=>s.checks)).length);
  assert.equal(F.gateReady(a),false);
 });
 test(`${ws}: recorded payloads reproduce fixtures`,()=>{
  const images=new Map(json('flows/images.json').filter(i=>i.workspace===ws).map(i=>[i.source,i.file]));
  const link=p=>{assert.ok(images.has(p),p);return images.get(p);};
  assert.deepEqual(F.designFromPayload(json(`flows/raw/${ws}-design.json`),link,true),json(`flows/${ws}-design.json`));
  const r=json(`flows/${ws}-test-run.json`);
  assert.deepEqual(JSON.parse(JSON.stringify(F.testRunFromPayloads(ws==='deck'?json('flows/raw/deck-release-test.json'):['android','ios'].map(p=>json(`flows/raw/your-trainer-${p}.json`)),link,{canWrite:true,step:r.step,open:r.open}))),r);
  assert.deepEqual(F.acceptFromPayloads(json(ws+'.json'),ws==='deck'?'FEAT-0024':'FEAT-0130',json(`flows/raw/${ws}-accept.json`),true),json(`flows/${ws}-accept.json`));
 });
}
test('empty design frame, revision strip, review pins and disabled decisions',()=>{
 const d=F.designFromPayload({rel_path:'designs/DES-1111.md',frontmatter:{id:'DES-1111',status:'proposed'},title:'Design 9000',html:'<h2>Revisions</h2><ul><li>Initial</li><li>Changed</li></ul><h2>Review</h2><p>Plate 1: move it</p><p>Plate 1: answered: moved</p>'});
 const s=F.designScene(json('deck.json'),d,ctx),n=[...walkScene(s.nodes)];look(s);
 assert.ok(n.some(n=>n.text==='nothing to look at'));assert.equal(d.revisions.length,2);
 assert.deepEqual(d.comments.map(c=>c.answered),[false,true]);assert.equal(n.filter(n=>n.action&&n.cls?.includes('ov-off')).length,2);
});
test('image resolution keeps docs-relative links and rejects remote or escaping images',()=>{
 assert.equal(F.docsImagePath('../images/a.png','designs/DES.md'),'images/a.png');assert.equal(F.docsImagePath('/docs/images/a%20b.png'),'images/a b.png');
 for(const p of ['https://a/b.png','data:image/png,a','//a/b.png','../../../secret.png','/etc/a.png','a.html','%zz.png','a\\b.png'])assert.equal(F.docsImagePath(p),null,p);
 assert.equal(F.deckImageHref('abcd1234','a b/c.png'),'/deck/file/abcd1234/a%20b/c.png');
});
test('results remain distinct and unknown never becomes pass',()=>{
 assert.deepEqual(F.RESULTS.map(F.resultFrom),F.RESULTS);assert.equal(F.resultFrom('new-result'),'unknown');assert.equal(F.worstResult(['pass','fail']),'fail');assert.equal(F.worstResult(['pass','not-run']),'not-run');
});
test('a note waits for all printed steps; platform, release and action separate results',()=>{
 const payload=(platform='android',release='REL-0017')=>({platform,release,sections:[{number:3,name:'Area',groups:[{checks:[{number:1,action:'first',tags:['TST-0001.1'],checks:['TST-0001'],expected:[]},{number:2,action:'second',tags:['TST-0001.2'],checks:['TST-0001'],expected:[]}]}]}],results:{}});
 const r=F.testRunFromPayloads([payload()]),[a,b]=r.platforms[0].sections[0].checks;
 assert.deepEqual(F.noteVerdicts(r,'android',{[a.key]:{result:'pass',reason:''}}),[]);
 assert.deepEqual(F.noteVerdicts(r,'android',{[a.key]:{result:'pass',reason:''},[b.key]:{result:'fail',reason:''}}),[]);
 assert.deepEqual(F.noteVerdicts(r,'android',{[a.key]:{result:'pass',reason:''},[b.key]:{result:'fail',reason:'wrong colour'}}),[{id:'TST-0001',platform:'android',verdict:'fail',reason:'check 2: wrong colour'}]);
 assert.notEqual(a.key,F.testRunFromPayloads([payload('ios')]).platforms[0].sections[0].checks[0].key);
 assert.notEqual(a.key,F.testRunFromPayloads([payload('android','REL-0018')]).platforms[0].sections[0].checks[0].key);
 assert.throws(()=>F.testRunFromPayloads([payload(),payload('ios','REL-0018')]),/different releases/);
});
test('a failed release-test read leaves no markable checks',()=>{
 const r=F.testRunFromPayloads([{platform:'android',release:'REL-0017',error:'unavailable',sections:[{number:1,groups:[]}]}]);assert.deepEqual(r.platforms[0].sections,[]);assert.equal(r.platforms[0].error,'unavailable');
});
test('only five known complete lamps enable Accept; global zero badges cannot supply evidence',()=>{
 const m=json('deck.json'),d=F.gateFromModel(m,'FEAT-0024');assert.equal(d.lamps.length,5);assert.equal(F.gateReady(d),false);
 const complete={...d,status:'review',canWrite:true,transitions:['done','doing'],lamps:d.lamps.map(l=>({...l,known:true,done:3,total:3,missing:[]}))};
 assert.equal(F.gateReady(complete),true);look(F.acceptScene(m,complete,ctx));assert.ok(F.acceptScene(m,complete,ctx).list.some(r=>r.action==='accept:accept'));
 for(const lamp of complete.lamps)for(const change of [{known:false},{done:2},{missing:['missing']}]) {
  const a={...complete,lamps:complete.lamps.map(l=>l===lamp?{...l,...change}:l)};assert.equal(F.gateReady(a),false);assert.ok([...walkScene(F.acceptScene(m,a,ctx).nodes)].find(n=>n.action==='accept:accept').cls.includes('ov-off'));
 }
 const raw=json('flows/raw/deck-accept.json'),a=F.acceptFromPayloads(m,'FEAT-0024',{...raw,criteria:{},acceptance:{schema_version:999},obligations:{views:{},total:0}},true);
 for(const k of ['requirements','automated','acceptance'])assert.equal(a.lamps.find(l=>l.key===k).known,false);
});
test('gate chip ratios give completed and total counts their own bars, including zero',()=>{
 const m=json('deck.json'),base=F.gateFromModel(m,'FEAT-0024');
 for(const [done,total] of [[0,0],[0,3],[2,3],[3,3]]) {
  const data={...base,lamps:base.lamps.map(l=>({...l,known:true,done,total,missing:[]}))};
  const scene=F.acceptScene(m,data,ctx),nodes=[...walkScene(scene.nodes)];look(scene);
  for(const lamp of data.lamps) {
   const counts=nodes.filter(n=>n.kind==='text'&&n.role==='number'&&n.markRef?.startsWith(`gate-${data.id}-${lamp.key}`));
   if(total===0){assert.equal(counts.length,0);continue;}
   assert.equal(counts.length,2);
   assert.deepEqual(counts.map(n=>Number(n.text)),[done,total]);
   const marks=counts.map(n=>nodes.find(m=>m.kind==='mark'&&m.markId===n.markRef));
   assert.deepEqual(marks.map(m=>m.count),[done,total]);
   assert.deepEqual(marks.map(m=>m.tag),['rect','rect']);
  }
 }
 const unknown=[...walkScene(F.acceptScene(m,base,ctx).nodes)];
 assert.equal(unknown.filter(n=>n.kind==='text'&&n.text==='not reported').length,5);
 assert.equal(unknown.filter(n=>n.kind==='text'&&n.role==='number').length,0);
});
test('copied images stay below 3 MB and the opened real check has both captures',()=>{
 const images=json('flows/images.json'),base=path.resolve(desktopRoot,'../docs/designs/__attachments__/DES-0005');assert.ok(images.reduce((n,i)=>n+fs.statSync(path.join(base,i.file)).size,0)<3_000_000);
 const r=json('flows/your-trainer-test-run.json'),c=r.platforms.flatMap(p=>p.sections.flatMap(s=>s.checks)).find(c=>c.key===r.open);assert.ok(c.before?.href&&c.after?.href);assert.ok(c.before.label.includes('workout-selection'));
});

function evidence(overrides={}) {
 return {note:{frontmatter:{id:'FEAT-0024',status:'review',tasks:[],requirements:[],reviewed_by:['model:a','model:b'],review_verdict:'approved',review_date:'2026-10-14',review_round:1}},criteria:{id:'FEAT-0024',requirements:[]},acceptance:{schema_version:4,exists:true,platform:'',tiers:[],view:{tiers:[]}},obligations:{total:0,views:{}},tests:[],...overrides};
}
test('empty lamps are hollow and neutral, with at least one real item needed to accept',()=>{
 const m=json('deck.json'),d=F.gateFromModel(m,'FEAT-0024');
 d.lamps=d.lamps.map(l=>({...l,known:true,total:0,done:0,missing:[]}));
 assert.equal(F.gateReady(d),false);assert.ok(d.lamps.every(l=>!F.lampComplete(l)));
 let scene=F.acceptScene(m,d,ctx),nodes=[...walkScene(scene.nodes)];look(scene);
 assert.equal(nodes.filter(n=>n.attrs?.role==='img'&&n.tag==='rect'&&n.attrs.stroke&&!n.glow).length,5);
 assert.equal(nodes.filter(n=>n.text==='nothing to check').length,5);
 assert.ok(scene.list.filter(r=>r.group==='Evidence').every(r=>r.label.includes('nothing to check')));
 d.lamps[4]={...d.lamps[4],total:1,done:1};assert.equal(F.gateReady(d),true);
 d.lamps[0].known=false;assert.equal(F.gateReady(d),false);
 const mapped=F.acceptFromPayloads(m,d.id,evidence());
 for(const key of ['requirements','tasks']){
  const lamp=mapped.lamps.find(l=>l.key===key);assert.equal(F.lampEmpty(lamp),true);
  assert.match(F.acceptScene(m,mapped,ctx).list.find(r=>r.id==='gate-'+key).label,/nothing to check/);
 }
});
test('every unknown lamp explains missing evidence, including malformed tiers and command results',()=>{
 const m=json('deck.json');
 const fixtures=[evidence(),evidence({acceptance:{}}),evidence({obligations:{}}),evidence({tests:[{frontmatter:{id:'TST-1111',command:'npm test'}}]}),
  evidence({acceptance:{schema_version:4,exists:true,platform:'',tiers:[{manual:false,items:[{id:'TST-1111',refs:['FEAT-0024'],mark:'done',stale:false}]},{items:[]}],view:{tiers:[{areas:[{items:[{id:'TST-1111',mark:'done',stale:false,verdict_method:'automated',verdict_date:'2026-10-14'}]}]}]}}})];
 for(const payload of fixtures){
  const d=F.acceptFromPayloads(m,'FEAT-0024',payload);assert.equal(F.gateReady(d),false);
  for(const l of d.lamps.filter(l=>!l.known))assert.ok(l.missing.some(s=>s.trim()),l.key);
  for(const row of F.acceptScene(m,d,ctx).list.filter(r=>r.group==='Evidence'))assert.ok(row.label.split(' · ')[1]||row.label.includes('nothing to check'),row.label);
 }
 const d=F.acceptFromPayloads(m,'FEAT-0024',fixtures[3]);assert.match(d.lamps.find(l=>l.key==='automated').missing.join(' '),/TST-1111: command result is not exposed/);
});
test('review provenance reads scalar and list identities without inventing a second reviewer',()=>{
 for(const reviewers of [['model:a','model:b'],'model:a, model:b','model:a; model:a',['user:edwin'],'user:edwin']){
  const p=evidence();p.note.frontmatter.reviewed_by=reviewers;
  assert.equal(F.lampComplete(F.acceptFromPayloads(json('deck.json'),'FEAT-0024',p).lamps.find(l=>l.key==='reviews')),true,JSON.stringify(reviewers));
 }
 for(const reviewers of ['model:a','',[], 'approved']){
  const p=evidence();p.note.frontmatter.reviewed_by=reviewers;
  assert.equal(F.lampComplete(F.acceptFromPayloads(json('deck.json'),'FEAT-0024',p).lamps.find(l=>l.key==='reviews')),false);
 }
});

test('S5 fans outlines behind one selected image and keeps every plate selectable',()=>{
 const m=json('deck.json'),d=json('flows/deck-design.json');
 for(const selected of [0,d.plates.length-1]){
  const scene=F.designScene(m,{...d,selected},ctx),nodes=[...walkScene(scene.nodes)];look(scene);
  assert.deepEqual(nodes.filter(n=>n.kind==='image').map(n=>n.href),[d.plates[selected].href]);
  const behind=scene.nodes.filter(n=>n.kind==='group'&&n.key?.startsWith('plate-')&&n.key!=='plate-'+selected);
  assert.equal(behind.length,d.plates.length-1);
  assert.ok(behind.every(n=>n.children.length===1&&n.children[0].cls==='ov-wire'));
  assert.equal(scene.list.filter(r=>r.group==='Plates').length,d.plates.length);
 }
});

for (const ws of ['deck', 'your-trainer']) test(`${ws}: gate chips label every category and keep every item and ticket mark in both sizes`, () => {
 const model=json(`${ws}.json`),data=json(`flows/${ws}-accept.json`);
 const labels=['Requirements','Tasks','Reviews','Automated tests','Acceptance tests'];
 for(const compact of [false,true]) {
  const gate=F.gateChips(data,100,200,compact?900:1200,{compact});
  const scene={screen:'accept',address:ctx.address({flow:'accept',note:data.id}),width:1440,height:1000,title:'Gate',nodes:gate.nodes,list:gate.rows};look(scene);
  assert.deepEqual(gate.nodes.map(n=>n.children.filter(c=>c.kind==='text'&&c.y<235).map(c=>c.text).join(' ')),labels);
  for(const lamp of data.lamps) {
   const chip=gate.nodes.find(n=>n.key===`gate-${data.id}-${lamp.key}`),nodes=[...walkScene([chip])];
   assert.equal(lamp.items.length,lamp.total,`${lamp.key} preserves item identities`);
   const squares=chip.children.filter(n=>n.kind==='group'&&n.key?.includes('-item-'));
   assert.equal(squares.length,lamp.total,`${lamp.key} squares`);
   for(const [i,item] of lamp.items.entries()) {
    if(!item.ticket)continue;
    const source=model.tickets[item.id];assert.ok(source,item.id);
    assert.deepEqual(item.ticket,{id:source.id,title:source.title,status:source.status,type:source.type,fill:source.fill,needsYou:source.needsYou});
    const marks=[...walkScene([squares[i]])].filter(n=>n.kind==='mark');
    assert.ok(marks[0].cls.includes(`ty-${source.type}`));
    assert.equal(marks[0].cls.includes('sq-solid'),!['open','deferred'].includes(source.fill));
    assert.equal(marks.some(n=>n.cls==='sq-dot'),source.needsYou);
    assert.equal(marks.some(n=>n.tag==='rect'&&n.cls==='sq-cut'),['doing','unproven'].includes(source.fill));
    assert.equal(squares[i].cls==='ov-doing',source.fill==='doing');
    assert.ok(gate.rows.some(r=>r.id===source.id),source.id);
   }
   const counts=nodes.filter(n=>n.kind==='text'&&n.role==='number');
   if(lamp.known&&lamp.total>0)assert.deepEqual(counts.map(n=>Number(n.text)),[lamp.done,lamp.total]);
   else assert.equal(counts.length,0,'unknown evidence never prints a false completed count');
   if(!lamp.known) {
    assert.ok(nodes.some(n=>n.text==='not reported'));
    assert.ok(nodes.every(n=>n.state!=='owed'));
    const frame=chip.children[0];assert.equal(frame.glow,undefined);assert.equal(frame.needsYou,undefined);
    assert.match(gate.rows.find(r=>r.id===`gate-${lamp.key}`).label,/not reported.*· .+/);
   }
  }
 }
});

test('chip item squares keep parked, dropped, unproven and attention distinct without certifying the gate',()=>{
 const model=json('deck.json'),data=F.gateFromModel(model,'FEAT-0024');
 const fills=['open','doing','delivered','unproven','dropped','deferred'];
 const lamp=data.lamps.find(l=>l.key==='tasks');
 lamp.known=true;lamp.total=fills.length;lamp.done=0;lamp.items=fills.map((fill,i)=>({id:`TASK-800${i}`,label:fill,ticket:{id:`TASK-800${i}`,title:'Task',type:'task',status:'backlog',fill,needsYou:i===0}}));
 const chip=F.gateChips(data,100,200,1200).nodes.find(n=>n.key.endsWith('-tasks'));
 const squares=chip.children.filter(n=>n.kind==='group');
 assert.equal(squares.length,6);
 assert.equal(squares[4].children.find(n=>n.tag==='line').cls,'sq-cut');
 assert.ok(squares[5].children.find(n=>n.tag==='line').cls.includes('sq-strike'));
 assert.equal(F.gateReady(data),false,'a delivered ticket square cannot substitute for gate evidence');
});

test('all flow ticket marks use cockpit squares and all result beads retain the cockpit words and glyphs',()=>{
 const model=json('deck.json');
 const {RESULT_MARK}=load('shared/overview-results.js');
 const resultWords=['Pass','Fail','Partial','Question','Blocked','N/A','Excused','To-do','Needs re-run','Unrecognised result'];
 const resultGlyphs=['[x]','[!]','[/]','[?]','[■]','[–]','[·]','[ ]','[↻]','[?]'];
 const results=[...F.RESULTS,'not-run','rerun','unknown'];
 const id=Object.keys(model.tickets).find(id=>model.tickets[id].type==='test');
 for(const [i,result] of results.entries()) {
  const check={key:'one',number:1,tickets:[id],action:'Read the screen',expected:'Shows a result',result,reason:'',preparation:false,evidence:''};
  const data={release:'REL-0001',platforms:[{id:'desktop',error:'',sections:[{number:1,slug:'marks',name:'Marks',checks:[check]}]}],step:'desktop',open:'one',canWrite:false};
  const scene=F.testRunScene(model,data,ctx),nodes=[...walkScene(scene.nodes)];look(scene);
  const bead=nodes.find(n=>n.action==='check:one');
  assert.equal(bead.ticket,undefined);assert.equal(bead.state,undefined);assert.equal(bead.fill,undefined);
  assert.equal(bead.attrs['data-result'],result);assert.equal(bead.attrs.stroke,RESULT_MARK[result].colour);
  assert.ok(bead.label.includes(resultWords[i])&&bead.label.includes(resultGlyphs[i]),bead.label);
  assert.ok(scene.list.some(r=>r.id===id&&r.group==='Test notes'));
  assert.ok(scene.list.some(r=>r.action==='check:one'&&r.label.includes(resultWords[i])));
  assert.ok(nodes.filter(n=>n.ticket).every(n=>n.tag==='rect'&&n.cls.includes(`ty-${model.tickets[n.ticket].type}`)));
 }
 for(const ws of ['deck','your-trainer']) {
  const m=json(`${ws}.json`);
  const scenes=[F.designScene(m,json(`flows/${ws}-design.json`),ctx),F.testRunScene(m,json(`flows/${ws}-test-run.json`),ctx),F.acceptScene(m,json(`flows/${ws}-accept.json`),ctx)];
  for(const scene of scenes) {
   const nodes=[...walkScene(scene.nodes)];
   assert.ok(nodes.filter(n=>n.ticket).every(n=>n.tag==='rect'&&n.cls.includes(`ty-${m.tickets[n.ticket].type}`)));
   // Source captions and revision prose stay verbatim; the UI's status words change.
   const design=json(`flows/${ws}-design.json`);
   const quoted=new Set([...design.plates.map(p=>p.label),...design.revisions.map(r=>r.label),...design.comments.map(c=>c.text)]);
   const obsolete=value=>value?.toLowerCase().includes('owed again')&&!quoted.has(value);
   assert.ok(!nodes.some(n=>obsolete(n.text)||obsolete(n.label)));
   assert.ok(!scene.list.some(r=>obsolete(r.label)));
  }
 }
});
