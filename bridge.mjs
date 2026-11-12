import {pathToFileURL} from 'node:url';

export function splitAgents(state) {
  if (!state?.agents || !Number.isFinite(state.seq)) throw Error('Invalid source state');
  const suites = {codex: [], chatgpt: []};
  for (const agent of Object.values(state.agents)) {
    const suite = String(agent.source).toLowerCase();
    if (!Object.hasOwn(suites, suite) || agent.status === 'offline') continue;
    const agents = suites[suite];
    agents.push({
      name: (agent.parent ? 'Support ' : 'Primary ') + (agents.length + 1),
      role: agent.parent ? 'support' : 'primary',
      status: ['idle', 'done', 'error'].includes(agent.status) ? 'idle' : 'active',
    });
  }
  return suites;
}

async function publish() {
  const local = new URL(process.env.LOCAL_FLOOR_URL ?? 'http://127.0.0.1:4317');
  const target = new URL(process.env.AGENT_FLOOR_URL);
  if (target.protocol !== 'https:' || !['localhost','127.0.0.1','[::1]'].includes(local.hostname)) {
    throw Error('Use a loopback source and an HTTPS destination');
  }
  const source = await fetch(new URL('/state', local), {signal:AbortSignal.timeout(4000),redirect:'error'});
  if (!source.ok) throw Error('Local floor returned ' + source.status);
  const suites = splitAgents(await source.json());
  await Promise.all(Object.entries(suites).map(async ([suite, agents]) => {
    const token = process.env[suite.toUpperCase() + '_FEED_TOKEN'];
    if (!token || (!agents.length && suite === 'chatgpt')) return;
    const response = await fetch(new URL('/api/activity/' + suite, target), {
      method:'POST', headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
      body:JSON.stringify({agents:agents.slice(0,200)}), signal:AbortSignal.timeout(8000), redirect:'error',
    });
    if (!response.ok) throw Error(suite + ' publisher returned ' + response.status);
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (;;) {
    try { await publish(); }
    catch (error) { console.error(error.message); }
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
}
