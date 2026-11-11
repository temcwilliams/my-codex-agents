import { getProject } from './project.mjs';
import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { startServer } from '../server/index.mjs';
const { VIEW_TOKEN, INGEST_TOKEN } = process.env;
if (!VIEW_TOKEN || !INGEST_TOKEN) throw new Error('VIEW_TOKEN and INGEST_TOKEN are required');
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a||'').digest(),createHash('sha256').update(b).digest());
const session=createHash('sha256').update(VIEW_TOKEN).digest('hex');
const internalPort=Number(process.env.INTERNAL_FLOOR_PORT)||4317;
const floor=await startServer({port:internalPort,host:'127.0.0.1'});
const login=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Codex agents</title><style>body{font:18px system-ui;max-width:420px;margin:15vh auto;padding:24px;background:#f8f7f4;color:#222}input,button{box-sizing:border-box;width:100%;padding:14px;margin:8px 0;font:inherit}button{background:#ff5f2e;color:white;border:0;border-radius:6px}</style><h1>My Codex agents</h1><p>Enter your viewer access code to open the live floor.</p><form method="post" action="/login"><input type="password" name="code" required placeholder="Access code" autocomplete="current-password"><button>Open live floor</button></form>`;
async function body(req){let text='';for await(const c of req){text+=c;if(text.length>1048576)throw new Error('Too large');}return text;}
createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex');
 const url=new URL(req.url,'http://localhost');
 try {
  if(url.pathname==='/health'){res.writeHead(200);res.end('ok');return;}
  if(url.pathname==='/login'&&req.method==='POST'){
   const code=new URLSearchParams(await body(req)).get('code');
   if(!equal(code,VIEW_TOKEN)){res.writeHead(401,{'Content-Type':'text/html'});res.end(login);return;}
   res.writeHead(303,{'Location':'/?poll=1','Set-Cookie':`floor_session=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`});res.end();return;
  }
  if(url.pathname==='/api/sync'&&req.method==='POST'){
   if(!equal(req.headers.authorization,`Bearer ${INGEST_TOKEN}`)){res.writeHead(401);res.end();return;}
   const snapshot=JSON.parse(await body(req));
   if(!snapshot.agents||!snapshot.teams||!Number.isFinite(snapshot.seq))throw new Error('Invalid state');
   for(const key of Object.keys(floor.state))delete floor.state[key];
   Object.assign(floor.state,snapshot);res.writeHead(200);res.end('ok');return;
  }
  const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('floor_session='))?.slice(14);
  if(!equal(cookie,session)){res.writeHead(url.pathname==='/'?200:401,{'Content-Type':'text/html'});res.end(login);return;}
  if(url.pathname==='/project'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(await getProject()));return;}
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(url.pathname==='/'&&!url.searchParams.has('poll')){res.writeHead(302,{'Location':'/?poll=1'});res.end();return;}
  if(!(url.pathname==='/'||url.pathname==='/state'||url.pathname==='/favicon.svg'||/^\/assets\/[a-zA-Z0-9_.-]+$/.test(url.pathname))){res.writeHead(404);res.end();return;}
  const upstream=await fetch(`http://127.0.0.1:${internalPort}`+url.pathname,{signal:AbortSignal.timeout(5000)});
  res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/octet-stream'});res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{res.writeHead(400);res.end('Request failed');}
}).listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('Protected Codex viewer ready'));
