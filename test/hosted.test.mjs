import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
test('hosted gateway protects state and writes, authenticates the viewer and accepts relay snapshots',async()=>{
 const view=randomBytes(24).toString('hex'),ingest=randomBytes(24).toString('hex');
 const app=spawn(process.execPath,['hosting/server.mjs'],{env:{...process.env,VIEW_TOKEN:view,INGEST_TOKEN:ingest,PORT:'24318',INTERNAL_FLOOR_PORT:'24317'},stdio:'pipe'});
 try{
  let ready=false;
  for(let i=0;i<50;i++){try{ready=(await fetch('http://127.0.0.1:24318/health')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'gateway started');const base='http://127.0.0.1:24318';
  assert.equal((await fetch(base+'/state')).status,401);
  assert.equal((await fetch(base+'/project')).status,401);
  assert.equal((await fetch(base+'/api/sync',{method:'POST',body:'{}'})).status,401);
  const login=await fetch(base+'/login',{method:'POST',body:new URLSearchParams({code:view}),redirect:'manual'});
  assert.equal(login.status,303);const cookie=login.headers.get('set-cookie').split(';')[0];
  const snapshot={agents:{},teams:{},seq:42,updatedAt:Date.now()};
  assert.equal((await fetch(base+'/api/sync',{method:'POST',headers:{Authorization:'Bearer '+ingest},body:JSON.stringify(snapshot)})).status,200);
  assert.equal((await (await fetch(base+'/state',{headers:{Cookie:cookie}})).json()).seq,42);
  assert.equal((await fetch(base+'/events',{method:'POST',headers:{Cookie:cookie},body:'{}'})).status,405);
 }finally{app.kill();}
});
