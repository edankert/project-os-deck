import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {desktopRoot,load,fakeSidecar} from './helpers.mjs';
const {SidecarWriteClient,transitionRequestFrom}=load('shared/write-client.js');
const {DeckHost}=load('main/host.js');
const {SERVED_CAPABILITIES,SHELL_CAPABILITIES}=load('shared/capability.js');
const {plainContext,walkScene}=load('shared/overview-scene.js');
const {addressFor}=load('shared/address.js');
const {designFlow,testRunFlow,acceptFlow,featureGate}=await import(pathToFileURL(path.join(desktopRoot,'dist/web/renderer/overview-flows.js')));
const {Host}=await import(pathToFileURL(path.join(desktopRoot,'dist/web/renderer/host-bridge.js')));
const model=JSON.parse(fs.readFileSync(path.join(desktopRoot,'fixtures/overview/deck.json'),'utf8'));
const actor='user:tester';
test('the new verbs post exact payloads with identity supplied by the main-process caller',async()=>{
 const sidecar=await fakeSidecar(Object.fromEntries(['decide','mark-check','acceptance-run'].map(v=>['/api/notes/'+v,{ok:true,result:{saved:true}}])));
 try{
  const client=new SidecarWriteClient(sidecar.base);
  await client.flow('decide',{id:'DES-0004',accept:true,mtime:10,reviewer:'agent:fake',actor:'agent:fake',reason:'unsupported'},actor);
  await client.flow('mark-check',{id:'TST-0001',verdict:'fail',reason:'Wrong colour',platform:'android',by:'agent:fake',method:'automated'},actor);
  await client.flow('acceptance-run',{id:'FEAT-0001',passed:3,failed:0,skipped:1,complete:true,issues:[],actor:'agent:fake'},actor);
  assert.deepEqual(sidecar.received.map(r=>[r.method,r.url,r.body]),[
   ['POST','/api/notes/decide',{id:'DES-0004',reviewer:actor,accept:true,mtime:10}],
   ['POST','/api/notes/mark-check',{id:'TST-0001',by:actor,method:'manual',platform:'android',verdict:'fail',reason:'Wrong colour'}],
   ['POST','/api/notes/acceptance-run',{id:'FEAT-0001',actor,passed:3,failed:0,skipped:1,issues:[],complete:true}],
  ]);
  const before=sidecar.received.length;
  assert.throws(()=>transitionRequestFrom({id:'DES-0004',to:'cancelled'},'agent:codex'),/person/);
  for(const v of ['decide','mark-check','acceptance-run'])await assert.rejects(client.flow(v,{id:'X'},'agent:codex'),/person/);
  await assert.rejects(client.flow('acceptance-run',{id:'X',passed:-1,failed:0,skipped:0},actor),/nonnegative/);
  assert.equal(sidecar.received.length,before);
 }finally{await sidecar.close();}
});
test('every new verb preserves a sidecar refusal in its own words',async()=>{
 const said='this verdict belongs to a person — reload and retry';
 const sidecar=await fakeSidecar(Object.fromEntries(['decide','mark-check','acceptance-run'].map(v=>['/api/notes/'+v,{ok:false,error:said}])));
 try{for(const v of ['decide','mark-check','acceptance-run'])await assert.rejects(new SidecarWriteClient(sidecar.base).flow(v,{id:'X',passed:0,failed:0,skipped:0},actor),e=>e.message===said);}finally{await sidecar.close();}
});
test('served HTTP refuses every flow POST and never forwards the corresponding GET',async()=>{
 const sidecar=await fakeSidecar(),host=new DeckHost({webRoot:path.join(desktopRoot,'dist/web'),capabilities:SERVED_CAPABILITIES,listWorkspaces:()=>[],sidecarBaseFor:()=>sidecar.base});const {port}=await host.listen(0);
 try{
  for(const v of ['decide','mark-check','acceptance-run']){
   const at=`http://127.0.0.1:${port}/deck/sidecar/abcd1234/api/notes/${v}`;
   assert.equal((await fetch(at,{method:'POST',body:'{}'})).status,405);assert.equal((await fetch(at)).status,403);
  }assert.equal(sidecar.received.length,0);
 }finally{await host.close();await sidecar.close();}
});
test('Host.write uses only the bridge, and a served Host writes nothing',async()=>{
 const host=new Host();let calls=[];
 try{
  delete globalThis.deck;
  for(const v of ['decide','mark-check','acceptance-run'])assert.deepEqual(await host.write(v,{}),{ok:false,error:'this host does not write'});
  globalThis.deck={capabilities:async()=>SHELL_CAPABILITIES,state:{subscribe:()=>()=>{}},write:Object.fromEntries(['decide','mark-check','acceptance-run'].map(v=>[v,async r=>{calls.push([v,r]);return{ok:true};}]))};
  await host.start();for(const v of ['decide','mark-check','acceptance-run'])await host.write(v,{id:'X'});
  assert.deepEqual(calls.map(c=>c[0]),['decide','mark-check','acceptance-run']);
 }finally{host.stop();delete globalThis.deck;}
});
test('preload exposes exactly the three new IPC calls without running Electron',async()=>{
 let exposed;const calls=[];
 const sandbox={exports:{},require:name=>{assert.equal(name,'electron');return{contextBridge:{exposeInMainWorld:(_name,api)=>{exposed=api;}},ipcRenderer:{invoke:async(...args)=>{calls.push(args);return{ok:true};}}};}};
 vm.runInNewContext(fs.readFileSync(path.join(desktopRoot,'dist/preload.js'),'utf8'),sandbox);
 for(const v of ['decide','mark-check','acceptance-run'])await exposed.write[v]({id:'X'});
 assert.deepEqual(calls.map(c=>c[0]),['deck:write:decide','deck:write:mark-check','deck:write:acceptance-run']);
});
function input(flow,noteId,overrides={}){
 return {model,address:addressFor('abcd1234','features',{flow,note:noteId}),ctx:plainContext('abcd1234','features'),memory:new Map(),canWrite:true,ask:async()=>null,write:async()=>{throw new Error('unexpected write');},read:async()=>{throw new Error('unexpected read');},...overrides};
}
function designRead(status='proposed') {return async at=>{
 if(at.startsWith('/api/cockpit/locate'))return{found:true,rel:'designs/DES-0004.md'};
 if(at.startsWith('/api/render'))return{frontmatter:{id:'DES-0004',status},title:'A design',rel_path:'designs/DES-0004.md',html:'<img src="/docs/images/plate.png" alt="Plate">'};
 if(at.startsWith('/api/notes/actions'))return{actions:[{verb:'Decline',to:'cancelled',disabled:false,endpoint:''}]};
 throw new Error(at);
};}
/** Deck's own index, faked: what `noteMtime` reads when a screen is drawn. */
async function withRecords(mtimeMs,fn){
 const saved=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({records:mtimeMs===undefined?[]:[{mtimeMs}]})});
 try{return await fn();}finally{globalThis.fetch=saved;}
}
test('S5 reads images from Deck and writes only on a verdict control; decline sends the reason by transition',async()=>{
 const seen=[],i=input('design','DES-0004',{read:designRead(),ask:async()=>'the main plate is unclear',write:async(v,r)=>{seen.push([v,r]);return{ok:true};}});
 const scene=await withRecords(10_000,()=>designFlow.scene(i));assert.equal(seen.length,0);
 assert.match(JSON.stringify(scene),/\/deck\/file\/abcd1234\/images\/plate.png/);
 // The note's time as the screen was drawn goes with the decision (the review of TASK-0160).
 await designFlow.onAction('decide:accept',i);assert.deepEqual(seen[0],['decide',{id:'DES-0004',accept:true,mtime:10}]);
 await designFlow.onAction('decide:decline',i);assert.deepEqual(seen[1],['transition',{id:'DES-0004',to:'cancelled',note:'the main plate is unclear',mtime:10}]);
});
test('S5 refuses stale status, served controls, cancelled reasons and an unknown note time, and propagates the exact refusal',async()=>{
 const i=input('design','DES-0004',{read:designRead('accepted')});await assert.rejects(designFlow.onAction('decide:accept',i),/only a proposed/);
 i.canWrite=false;await assert.rejects(designFlow.onAction('decide:accept',i),/does not write/);
 i.canWrite=true;i.read=designRead();await withRecords(10_000,()=>designFlow.scene(i));assert.equal(await designFlow.onAction('decide:decline',i),false);
 // Drawn without a time Deck could read: the decision is refused, never sent unguarded.
 await withRecords(undefined,()=>designFlow.scene(i));
 i.write=async()=>{throw new Error('unexpected write');};
 await assert.rejects(designFlow.onAction('decide:accept',i),/could not tell when DES-0004 last changed/);
 await withRecords(10_000,()=>designFlow.scene(i));
 i.write=async()=>({ok:false,error:'note changed on disk since it was read — reload and retry'});
 await assert.rejects(designFlow.onAction('decide:accept',i),e=>e.message==='note changed on disk since it was read — reload and retry');
});
const page=(platform='android')=>({platform,release:'REL-0017',sections:[{number:3,name:'Workouts',groups:[{checks:[{number:1,action:'Open workouts',expected:[{text:'See the list'}],checks:['TST-0001'],tags:['TST-0001.1']},{number:2,action:'Choose a workout',expected:[{text:'See details'}],checks:['TST-0001'],tags:['TST-0001.2']}]}]}],results:{}});
function runInput(){const seen=[];const i=input('test-run','REL-0017',{read:async at=>at.startsWith('/api/cockpit/acceptance')?{ledger_platforms:['android','ios']}:page(new URL(at,'http://fake').searchParams.get('platform')),write:async(v,r)=>{seen.push([v,r]);return{ok:true};},ask:async()=>'incorrect details'});i.address.step='android.3';return{i,seen};}
test('S6 records printed steps locally, then writes one note result after every step, on the selected platform',async()=>{
 const {i,seen}=runInput();const scene=await testRunFlow.scene(i),actions=scene.list.filter(r=>r.action?.startsWith('check:')&&r.group==='android: Workouts');assert.equal(seen.length,0);
 await testRunFlow.onAction(actions[0].action,i);await testRunFlow.onAction('mark:pass',i);assert.equal(seen.length,0);
 await testRunFlow.onAction(actions[1].action,i);await testRunFlow.onAction('mark:fail',i);
 assert.deepEqual(seen,[['mark-check',{id:'TST-0001',platform:'android',verdict:'fail',reason:'check 2: incorrect details'}]]);
});
test('S6 cancelled reasons and served controls never write; refused results do not replace the previous step',async()=>{
 const {i,seen}=runInput(),scene=await testRunFlow.scene(i),actions=scene.list.filter(r=>r.action?.startsWith('check:')&&r.group==='android: Workouts');
 await testRunFlow.onAction(actions[0].action,i);i.ask=async()=>null;assert.equal(await testRunFlow.onAction('mark:fail',i),false);assert.equal(seen.length,0);
 i.canWrite=false;await assert.rejects(testRunFlow.onAction('mark:pass',i),/does not write/);i.canWrite=true;
 await testRunFlow.onAction('mark:pass',i);await testRunFlow.onAction(actions[1].action,i);i.write=async()=>({ok:false,error:'agent verdict refused'});
 await assert.rejects(testRunFlow.onAction('mark:pass',i),e=>e.message==='agent verdict refused');assert.equal(Object.keys(i.memory.get('deck:steps:v2:'+i.ctx.workspaceId)).length,1);
});
test('S6 historic release is readable but cannot write into the current ledger',async()=>{
 const {i,seen}=runInput();i.address.note='REL-0016';const read=i.read;i.read=async at=>{const p=await read(at);if(at.includes('release=REL-0016'))p.release='REL-0016';return p;};
 await testRunFlow.scene(i);await assert.rejects(testRunFlow.onAction('mark:pass',i),/current release/);assert.equal(seen.length,0);
});
function acceptInput(requested=false,actions=[{to:'done',disabled:false},{to:'doing',disabled:false}]){
 const seen=[],m=structuredClone(model);m.tickets['FEAT-9999']={id:'FEAT-9999',title:'Example',kind:'feat',status:'review',state:'progress',phase:null,placedBy:'none',links:[]};
 const payload={schema_version:4,exists:true,platform:'',tiers:[{manual:false,items:[{id:'TST-9991',refs:['FEAT-9999'],name:'Automatic',automation:'full',mark:'done',stale:false}]},{manual:true,items:[{id:'TST-9992',refs:['FEAT-9999'],name:'Manual',automation:'partial',mark:'done',stale:false}]}],view:{tiers:[{areas:[{items:[{id:'TST-9991',mark:'done',verdict_method:'automated',verdict_date:'2026-10-14',stale:false}]}]}]}};
 const i=input('accept','FEAT-9999',{model:m,ask:async()=>'needs work',read:async at=>{
  if(at.startsWith('/api/cockpit/locate'))return{found:true,rel:'feature.md'};
  if(at.startsWith('/api/render'))return{title:'Example',frontmatter:{id:'FEAT-9999',status:'review',tasks:[],requirements:[],reviewed_by:['model:a','model:b'],review_verdict:'approved',review_date:'2026-10-14',review_round:1,acceptance:requested?'requested':''}};
  if(at.startsWith('/api/notes/actions'))return{actions};
  if(at.startsWith('/api/notes/acceptance'))return{id:'FEAT-9999',requirements:[],totals:{open:0,ticked:0,reconciled:0}};
  if(at.startsWith('/api/cockpit/acceptance'))return payload;
  if(at.startsWith('/api/cockpit/obligations'))return{views:{},total:0};
  throw new Error(at);
 },write:async(v,r)=>{seen.push([v,r]);return{ok:true};}});return{i,seen,payload};
}
test('S3 can load the same live gate as S7 without changing its address or writing',async()=>{
 const {i,seen}=acceptInput();
 const expected=await featureGate(i);
 i.address=addressFor('abcd1234','features',{page:'ticket',note:'FEAT-0024'});
 const before=structuredClone(i.address);
 assert.deepEqual(await featureGate(i,'FEAT-9999'),expected);
 assert.deepEqual(i.address,before);assert.deepEqual(seen,[]);
 const scene=await acceptFlow.scene({...i,address:addressFor('abcd1234','features',{flow:'accept',note:'FEAT-9999'})});
 const gate=load('shared/overview-gate.js').gateArch(expected,1010,540,200);
 assert.deepEqual(scene.list.filter(r=>r.group==='Evidence'),gate.rows);
 assert.ok(expected.lamps.some(l=>l.known&&l.done>0));
});
test('featureGate falls back to neutral model evidence when sidecar reads fail',async()=>{
 for(const route of ['/api/cockpit/locate','/api/notes/acceptance','/api/cockpit/acceptance','/api/cockpit/obligations']) {
  const {i,seen}=acceptInput(),read=i.read;
  i.read=async at=>{if(at.startsWith(route))throw new Error('sidecar offline');return read(at);};
  const data=await featureGate(i);
  assert.equal(data.canWrite,false);assert.deepEqual(data.transitions,[]);
  assert.ok(data.lamps.every(l=>!l.known&&l.missing.some(m=>m.includes('sidecar offline'))));
  const scene=await acceptFlow.scene(i);
  assert.ok([...walkScene(scene.nodes)].find(n=>n.action==='accept:accept').cls.includes('ov-off'));
  await assert.rejects(acceptFlow.onAction('accept:accept',i));assert.deepEqual(seen,[]);
 }
 await assert.rejects(featureGate(input('accept','TASK-0001')),/feature id/);
});
test('S7 uses acceptance-run for an opted-in feature and transition otherwise; Send back carries a reason',async()=>{
 for(const requested of [true,false]){
  const {i,seen}=acceptInput(requested);const scene=await acceptFlow.scene(i);assert.ok(scene.list.some(r=>r.action==='accept:accept'));assert.equal(seen.length,0);
  await acceptFlow.onAction('accept:accept',i);assert.equal(seen[0][0],requested?'acceptance-run':'transition');
  if(requested)assert.deepEqual(seen[0][1],{id:'FEAT-9999',passed:0,failed:0,skipped:0,complete:true,issues:[]});
  await acceptFlow.onAction('accept:back',i);assert.deepEqual(seen[1],['transition',{id:'FEAT-9999',to:'doing',note:'needs work'}]);
 }
});
test('S7 refreshes the evidence before accepting, honours cancellation and shows the cockpit transition refusal',async()=>{
 const {i,seen,payload}=acceptInput();await acceptFlow.scene(i);payload.tiers[0].items[0].mark='important';
 await assert.rejects(acceptFlow.onAction('accept:accept',i),/missing evidence/);assert.equal(seen.length,0);
 i.ask=async()=>null;assert.equal(await acceptFlow.onAction('accept:back',i),false);
 i.ask=async()=>'retry';const said="a feature at 'review' is not moved to 'doing' from the cockpit";i.write=async()=>({ok:false,error:said});await assert.rejects(acceptFlow.onAction('accept:back',i),e=>e.message===said);
 i.canWrite=false;await assert.rejects(acceptFlow.onAction('accept:back',i),/does not write/);
});

test('coverage is not a run: a manual verdict cannot light the automated lamp',async()=>{
 const {i,payload,seen}=acceptInput();payload.view.tiers[0].areas[0].items[0].verdict_method='manual';
 const scene=await acceptFlow.scene(i);assert.ok([...walkScene(scene.nodes)].find(n=>n.action==='accept:accept').cls.includes('ov-off'));
 await assert.rejects(acceptFlow.onAction('accept:accept',i),/missing evidence/);assert.equal(seen.length,0);
});
test('a changed ledger result invalidates an unfinished local step',async()=>{
 const {i}=runInput();const scene=await testRunFlow.scene(i);
 const first=scene.list.find(r=>r.action?.startsWith('check:')&&r.group==='android: Workouts');
 await testRunFlow.onAction(first.action,i);await testRunFlow.onAction('mark:pass',i);assert.equal(Object.keys(i.memory.get('deck:steps:v2:'+i.ctx.workspaceId)).length,1);
 const read=i.read;i.read=async at=>{const p=await read(at);if(at.startsWith('/api/cockpit/release-test'))p.results={'TST-0001':{result:'fail',reason:'another run',date:'2026-10-14'}};return p;};
 await testRunFlow.scene(i);assert.equal(Object.keys(i.memory.get('deck:steps:v2:'+i.ctx.workspaceId)).length,0);
});
test('each More result requires a reason and sends its exact cockpit result word',async()=>{
 for(const verdict of ['partial','question','blocked','na','excused']){
  const {i,seen}=runInput();const read=i.read;i.read=async at=>{const p=await read(at);if(p.sections)p.sections[0].groups[0].checks.length=1;return p;};
  await testRunFlow.scene(i);let prompts=0;i.ask=async()=>{prompts++;return 'observed reason';};
  await testRunFlow.onAction('mark:'+verdict,i);assert.equal(prompts,1);assert.deepEqual(seen,[['mark-check',{id:'TST-0001',platform:'android',verdict,reason:'check 1: observed reason'}]]);
 }
});

test('S7 disables absent, refused and differently routed transitions and rechecks before writing',async()=>{
 for(const actions of [[],[{to:'done',disabled:true},{to:'doing',disabled:true}],[{to:'done',disabled:false,endpoint:'/other'},{to:'doing',disabled:false,endpoint:'/other'}]]){
  const {i,seen}=acceptInput(false,actions),scene=await acceptFlow.scene(i);
  for(const action of ['accept:accept','accept:back']){
   const button=[...walkScene(scene.nodes)].find(n=>n.action===action);
   assert.ok(button.cls.includes('ov-off'));assert.match(button.label,/cockpit does not yet move a feature out of review/);
   assert.match(scene.list.find(r=>r.action===action).label,/cockpit does not yet move/);
   await assert.rejects(acceptFlow.onAction(action,i),/cockpit does not yet move/);
  }assert.equal(seen.length,0);
 }
 const actions=[{to:'done',disabled:false},{to:'doing',disabled:false}],{i,seen}=acceptInput(false,actions);
 assert.ok(![...walkScene((await acceptFlow.scene(i)).nodes)].find(n=>n.action==='accept:accept').cls.includes('ov-off'));
 actions.length=0;await assert.rejects(acceptFlow.onAction('accept:accept',i),/cockpit does not yet move/);assert.equal(seen.length,0);
 const read=i.read;i.read=at=>at.startsWith('/api/notes/actions')?Promise.reject(new Error('offline')):read(at);
 assert.ok([...walkScene((await acceptFlow.scene(i)).nodes)].find(n=>n.action==='accept:back').cls.includes('ov-off'));
});
test('S7 offers the opted-in stamp without transitions and counts reconciled criteria as skipped',async()=>{
 const {i,seen}=acceptInput(true,[]),read=i.read;
 i.read=async at=>{const p=await read(at);if(at.startsWith('/api/notes/acceptance'))p.totals={open:0,ticked:3,reconciled:2};return p;};
 const scene=await acceptFlow.scene(i),nodes=[...walkScene(scene.nodes)];
 assert.ok(nodes.some(n=>n.rest&&n.text==='Records acceptance without changing status'));
 assert.ok(!nodes.find(n=>n.action==='accept:accept').cls.includes('ov-off'));
 assert.ok(nodes.find(n=>n.action==='accept:back').cls.includes('ov-off'));
 await acceptFlow.onAction('accept:accept',i);
 assert.deepEqual(seen,[['acceptance-run',{id:'FEAT-9999',passed:3,failed:0,skipped:2,complete:true,issues:[]}]]);
});

function storedSteps(t) {
 const saved=new Map(),previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;});
 return saved;
}
test('S6 saved steps survive a changed head but separate workspace, release, platform and expected content',async t=>{
 const saved=storedSteps(t),{i}=runInput();await testRunFlow.scene(i);await testRunFlow.onAction('mark:pass',i);
 assert.equal(saved.size,1);
 const persisted=[...saved.values()][0];
 const resumed=runInput().i;resumed.model={...model,head:'an unrelated commit'};
 const first=scene=>scene.list.find(r=>r.action?.startsWith('check:')&&r.group==='android: Workouts');
 assert.match(first(await testRunFlow.scene(resumed)).label,/— \[x\] Pass/);
 const another=runInput().i;another.memory=resumed.memory;another.ctx=plainContext('bbbbbbbb','features');
 assert.match(first(await testRunFlow.scene(another)).label,/— \[ \] To-do/);
 const otherRelease=runInput().i;otherRelease.address.note='REL-0018';const releaseRead=otherRelease.read;
 otherRelease.read=async at=>{const p=await releaseRead(at);if(p.release)p.release='REL-0018';return p;};
 assert.match(first(await testRunFlow.scene(otherRelease)).label,/— \[ \] To-do/);
 assert.equal([...saved.values()][0],persisted,'reading another release must preserve this release');
 const ios=(await testRunFlow.scene(resumed)).list.find(r=>r.action?.startsWith('check:')&&r.group==='ios: Workouts');assert.match(ios.label,/— \[ \] To-do/);
 const changed=runInput().i,read=changed.read;
 changed.read=async at=>{const p=await read(at);if(p.sections)p.sections[0].groups[0].checks[0].expected=[{text:'See a different list'}];return p;};
 assert.match(first(await testRunFlow.scene(changed)).label,/— \[ \] To-do/);
 assert.deepEqual(JSON.parse([...saved.values()][0]),{},'changed content drops the old result from storage');
});
test('S6 persists stale ledger-result deletion and cannot resurrect it on reload',async t=>{
 const saved=storedSteps(t),{i}=runInput();await testRunFlow.scene(i);await testRunFlow.onAction('mark:pass',i);
 assert.equal(Object.keys(JSON.parse([...saved.values()][0])).length,1);
 const read=i.read;i.read=async at=>{const p=await read(at);if(p.sections)p.results={'TST-0001':{result:'fail',date:'2026-10-15'}};return p;};
 await testRunFlow.scene(i);assert.deepEqual(JSON.parse([...saved.values()][0]),{});
 const reloaded=runInput().i;
 assert.match((await testRunFlow.scene(reloaded)).list.find(r=>r.action?.startsWith('check:')&&r.group==='android: Workouts').label,/— \[ \] To-do/);
});

// TASK-0160 — a ticket at triage is decided from S3 with the sidecar's own verbs, read live,
// through the shell's write path, with the note's modification time as the guard.
test('a triage ticket is decided from its ticket screen with the sidecar verbs, read again before writing', async () => {
  await import(pathToFileURL(path.join(desktopRoot, 'dist/web/renderer/overview-pages.js')));
  const { registeredScreen } = await import(pathToFileURL(path.join(desktopRoot, 'dist/web/renderer/overview.js')));
  const page = registeredScreen('page', 'ticket');
  const m = structuredClone(model);
  m.tickets['ISS-9001'] = { id: 'ISS-9001', title: 'A new issue', kind: 'iss', type: 'issue', status: 'triage', state: 'open', fill: 'open', needsYou: true, needs: { reason: 'triage', say: 'Decide: take it into the backlog, or decline it', action: { verbs: true } }, phase: null, placedBy: 'none', links: [] };
  let offered = [{ verb: 'Accept', to: 'open', confirm: false, disabled: false, reason: '', endpoint: '' }, { verb: 'Defer', to: 'deferred', confirm: false, disabled: false, reason: '', endpoint: '' }, { verb: 'Decline', to: 'declined', confirm: true, disabled: false, reason: '', endpoint: '' }];
  const seen = [];
  const savedFetch = globalThis.fetch;
  let recordMs = 12_000;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ records: recordMs === undefined ? [] : [{ id: 'ISS-9001', mtimeMs: recordMs }] }) });
  try {
    let answer = 'not ours to fix';
    const i = { model: m, address: addressFor('abcd1234', 'features', { page: 'ticket', note: 'ISS-9001' }), ctx: plainContext('abcd1234', 'features'), memory: new Map(), canWrite: true,
      read: async (at) => { if (at.startsWith('/api/notes/actions')) return { actions: offered }; throw new Error(at); },
      write: async (verb, request) => { seen.push([verb, request]); return { ok: true }; }, ask: async () => answer };
    const scene = await page.scene(i);
    assert.deepEqual([...walkScene(scene.nodes)].filter((n) => n.action?.startsWith('needs:')).map((n) => n.action).sort(), ['needs:declined', 'needs:deferred', 'needs:open']);
    // The note changes after the screen was drawn: the write still carries the drawn time,
    // so the sidecar can refuse a decision made over text the person never saw.
    recordMs = 99_000;
    assert.equal(await page.onAction('needs:open', i), true);
    assert.deepEqual(seen.pop(), ['transition', { id: 'ISS-9001', to: 'open', mtime: 12 }]);
    assert.equal(await page.onAction('needs:declined', i), true);
    assert.deepEqual(seen.pop(), ['transition', { id: 'ISS-9001', to: 'declined', note: 'not ours to fix', mtime: 12 }]);
    answer = null;
    assert.equal(await page.onAction('needs:declined', i), false, 'declining without a reason writes nothing');
    offered = offered.map((v) => (v.to === 'open' ? { ...v, disabled: true, reason: 'already open' } : v));
    await assert.rejects(page.onAction('needs:open', i), /already open/, 'a verb the sidecar now refuses is not sent');
    offered = offered.filter((v) => v.to !== 'deferred');
    await assert.rejects(page.onAction('needs:deferred', i), /no longer offers/);
    // Drawn without a time Deck could read: nothing is written.
    recordMs = undefined;
    await page.scene(i);
    await assert.rejects(page.onAction('needs:declined', i), /could not tell when ISS-9001 last changed/);
    i.canWrite = false;
    await assert.rejects(page.onAction('needs:open', i), /does not write/);
    assert.equal(seen.length, 0);
    assert.equal(await page.onAction('rephase:PHASE-0001', i), false, "other actions are not the ticket page's");
  } finally {
    globalThis.fetch = savedFetch;
  }
});
