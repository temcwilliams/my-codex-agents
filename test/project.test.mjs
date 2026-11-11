import {test} from 'node:test';import assert from 'node:assert/strict';import {loadProject} from '../hosting/project.mjs';
test('repository tracker maps real API fields and labels independent failures',async()=>{
 const calls=[];const data=await loadProject(async url=>{calls.push(url);if(url.includes('/commits'))return {ok:true,json:async()=>[{sha:'abc',commit:{message:'First change\nBody',committer:{date:'2026-11-11'}}}]};if(url.includes('/pulls'))return {ok:false,status:403};return {ok:true,json:async()=>({workflow_runs:[{id:12,name:'CI',status:'completed',conclusion:'success'}]})}});
 assert.equal(calls.length,3);assert.equal(data.commits[0].title,'First change');assert.equal(data.builds[0].status,'success');assert.deepEqual(data.errors,['Pull requests: GitHub returned 403']);assert.equal(data.repo,'temcwilliams/codex-convos');
});
