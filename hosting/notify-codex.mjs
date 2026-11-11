// Codex completed-turn notification. Secrets stay in the ignored local config.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fromCodex } from '../adapters/codex.mjs';
import { applyEvent, normalizeEvent } from '../shared/protocol.js';
try {
 const payload=JSON.parse(process.argv.at(-1));
 const events=fromCodex(payload);
 const config=Object.fromEntries((await readFile(new URL('../.env.hosting',import.meta.url),'utf8')).split('\n').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
 const url=config.AGENT_VIEWER_URL;
 if(!url?.startsWith('https://')) process.exit(0);
 let state;
 try {
  const posted=await fetch('http://127.0.0.1:4317/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(events),signal:AbortSignal.timeout(1000)});
  if(!posted.ok)throw new Error();
  state=await (await fetch('http://127.0.0.1:4317/state',{signal:AbortSignal.timeout(1000)})).json();
 } catch {
  const cookie='floor_session='+createHash('sha256').update(config.VIEW_TOKEN).digest('hex');
  const response=await fetch(new URL('/state',url),{headers:{Cookie:cookie},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error();
  state=await response.json();
  for(const event of events)applyEvent(state,normalizeEvent(event));
 }
 await fetch(new URL('/api/sync',url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.INGEST_TOKEN},body:JSON.stringify(state),signal:AbortSignal.timeout(8000)});
} catch { /* Observation must never break Codex. */ }
