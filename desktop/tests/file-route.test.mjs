import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {desktopRoot,load,fakeSidecar} from './helpers.mjs';
const {DeckHost,isForwardable}=load('main/host.js');
const {SERVED_CAPABILITIES}=load('shared/capability.js');
const rawGet=(port,p,method='GET')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:p,method},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
async function fixture(fn){
 const root=fs.mkdtempSync(path.join(desktopRoot,'dist','images-')),docs=path.join(root,'docs');fs.mkdirSync(path.join(docs,'pictures'),{recursive:true});
 for(const ext of ['png','jpg','jpeg','gif','webp','svg'])fs.writeFileSync(path.join(docs,'pictures','plate.'+ext),'image bytes');
 fs.writeFileSync(path.join(docs,'pictures','a b.png'),'space');fs.writeFileSync(path.join(root,'secret.png'),'outside');fs.writeFileSync(path.join(docs,'private.md'),'private');fs.symlinkSync(path.join(root,'secret.png'),path.join(docs,'escape.png'));
 const host=new DeckHost({webRoot:path.join(desktopRoot,'dist/web'),capabilities:SERVED_CAPABILITIES,listWorkspaces:()=>[{id:'abcd1234',root,name:'Fixture'}],sidecarBaseFor:()=>null,docsRootFor:id=>id==='abcd1234'?docs:null});
 const {port}=await host.listen(0);try{await fn(port);}finally{await host.close();fs.rmSync(root,{recursive:true,force:true});}
}
test('GET and HEAD serve each image type, spaces, MIME and sandbox headers',()=>fixture(async port=>{
 for(const ext of ['png','jpg','jpeg','gif','webp','svg']){
  const at='/deck/file/abcd1234/pictures/plate.'+ext, r=await rawGet(port,at);assert.equal(r.status,200,at);assert.equal(r.body,'image bytes');assert.match(r.headers['content-type'],/^image\//);assert.match(r.headers['content-security-policy'],/sandbox/);assert.equal(r.headers['x-content-type-options'],'nosniff');
  const h=await rawGet(port,at,'HEAD');assert.equal(h.status,200);assert.equal(h.body,'');assert.equal(h.headers['content-length'],'11');
 }
 assert.equal((await rawGet(port,'/deck/file/abcd1234/pictures/a%20b.png')).body,'space');
}));
test('traversal, encoded traversal, symlink escape, unsupported type and unknown workspace expose no bytes',()=>fixture(async port=>{
 for(const p of ['../secret.png','pictures/../../secret.png','%2e%2e/secret.png','%252e%252e/secret.png','pictures%2f..%2f..%2fsecret.png','..%5csecret.png','private.md','escape.png','%ff.png','pictures/plate.png%00','/pictures/plate.png']){
  const r=await rawGet(port,'/deck/file/abcd1234/'+p);assert.ok(r.status>=400,p);assert.ok(!['outside','image bytes','private'].includes(r.body));
 }
 assert.equal((await rawGet(port,'/deck/file/nope1234/pictures/plate.png')).status,404);
}));
test('all write methods are refused before reading an image',()=>fixture(async port=>{
 for(const m of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=await rawGet(port,'/deck/file/abcd1234/pictures/plate.png',m);assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, HEAD');}
}));
test('only the three new evidence GETs are forwarded, with queries intact',async()=>{
 const paths=['/api/cockpit/release-test','/api/cockpit/obligations','/api/notes/acceptance'];
 const sidecar=await fakeSidecar(Object.fromEntries(paths.map(p=>[p,{read:true}])));
 const host=new DeckHost({webRoot:path.join(desktopRoot,'dist/web'),capabilities:SERVED_CAPABILITIES,listWorkspaces:()=>[],sidecarBaseFor:()=>sidecar.base});const {port}=await host.listen(0);
 try{
  for(const p of paths){assert.equal(isForwardable(p),true);const r=await fetch(`http://127.0.0.1:${port}/deck/sidecar/abcd1234${p}?platform=android&release=REL-0017`);assert.equal(r.status,200);}
  assert.ok(sidecar.received.every(r=>r.method==='GET'&&r.url.endsWith('?platform=android&release=REL-0017')));
  for(const v of ['decide','mark-check','acceptance-run'])assert.equal(isForwardable('/api/notes/'+v),false);
 }finally{await host.close();await sidecar.close();}
});
