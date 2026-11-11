// Configure AGENT_VIEWER_URL and AGENT_VIEWER_INGEST_TOKEN in this process's environment.
const { AGENT_VIEWER_URL, AGENT_VIEWER_INGEST_TOKEN }=process.env;
if(!AGENT_VIEWER_URL?.startsWith('https://')||!AGENT_VIEWER_INGEST_TOKEN)throw new Error('HTTPS viewer URL and ingest token are required');
for(;;){
 try{
  const local=await fetch('http://127.0.0.1:4317/state',{signal:AbortSignal.timeout(5000)});
  if(!local.ok)throw new Error('Floor unavailable');
  const data=await local.text();
  const response=await fetch(new URL('/api/sync',AGENT_VIEWER_URL),{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${AGENT_VIEWER_INGEST_TOKEN}`},body:data,signal:AbortSignal.timeout(15000)});
  if(!response.ok)console.error('Sync response:',response.status);
 }catch{console.error('Sync temporarily unavailable');}
 await new Promise(r=>setTimeout(r,10000));
}
