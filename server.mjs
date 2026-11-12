import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {timingSafeEqual} from 'node:crypto';

const suites = ['codex', 'chatgpt'];
const feeds = new Map();
const files = new Map(await Promise.all([
  ['/', 'index.html', 'text/html'],
  ['/floor.js', 'floor.js', 'text/javascript'],
].map(async ([path, file, type]) => [path, {type, body: await readFile(new URL(file, import.meta.url))}])));

function authorized(request, suite) {
  const key = process.env[suite.toUpperCase() + '_FEED_TOKEN'];
  if (!key) return false;
  const expected = Buffer.from('Bearer ' + key);
  const actual = Buffer.from(request.headers.authorization ?? '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function valid(agents) {
  return Array.isArray(agents) && agents.length <= 200 && agents.every(agent =>
    agent && typeof agent.name === 'string' && agent.name.trim().length > 0 && agent.name.length <= 100 &&
    ['primary', 'support'].includes(agent.role) && ['active', 'idle'].includes(agent.status));
}

export const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  function json(status, data) {
    response.writeHead(status, {'Content-Type':'application/json'});
    response.end(JSON.stringify(data));
  }
  const path = request.url;
  if (request.method === 'GET' && files.has(path)) {
    const file = files.get(path);
    response.writeHead(200, {'Content-Type':file.type + '; charset=utf-8'});
    return response.end(file.body);
  }
  if (request.method === 'GET' && path === '/healthz') return json(200, {ok:true});
  if (request.method === 'GET' && path === '/api/activity') {
    return json(200, Object.fromEntries(suites.map(suite => {
      const feed = feeds.get(suite);
      const live = feed && Date.now() - feed.time < 30000;
      return [suite, live ? {state:'Live',agents:feed.agents} :
        {state:feed ? 'Feed stale' : 'Feed unavailable',agents:[]}];
    })));
  }
  const suite = suites.find(name => path === '/api/activity/' + name);
  if (request.method !== 'POST' || !suite) return json(404, {error:'Not found'});
  if (!authorized(request, suite)) return json(401, {error:'Unauthorized'});
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of request.iterator({destroyOnReturn:false})) {
      length += chunk.length;
      if (length > 65536) {
        request.resume();
        return json(413, {error:'Snapshot too large'});
      }
      chunks.push(chunk);
    }
    const {agents} = JSON.parse(Buffer.concat(chunks).toString());
    if (!valid(agents)) return json(400, {error:'Invalid agent snapshot'});
    feeds.set(suite, {time:Date.now(), agents:agents.map(({name, role, status}) => ({name, role, status}))});
    return json(200, {ok:true});
  } catch {
    return json(400, {error:'Invalid JSON'});
  }
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
