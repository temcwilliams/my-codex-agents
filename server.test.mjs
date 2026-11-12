import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {test} from 'node:test';
import {server} from './server.mjs';

async function request(url, {method = 'GET', token, body} = {}) {
  const input = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(input, {method, url, headers: {authorization: token && 'Bearer ' + token}});
  let result;
  const output = {setHeader() {}, writeHead(status) {result = {status};}, end(body) {result.body = body;}};
  await server.listeners('request')[0](input, output);
  return result;
}

test('serves the dashboard and handles independent activity snapshots', async context => {
  process.env.CODEX_FEED_TOKEN = 'test-key';
  context.after(() => delete process.env.CODEX_FEED_TOKEN);
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/floor.js')).status, 200);
  assert.equal((await request('/healthz')).status, 200);
  const post = (token, agents) => request('/api/activity/codex', {method:'POST',token,body:{agents}});
  assert.equal((await post('wrong', [])).status, 401);
  assert.equal((await post('test-key', [{name:'A',role:'support',status:'invalid'}])).status, 400);
  const agents = [
    {name:'Lead',role:'primary',status:'active'},
    {name:'Researcher',role:'support',status:'active'},
    {name:'Reviewer',role:'support',status:'idle'},
  ];
  assert.equal((await post('test-key', agents)).status, 200);
  const data = async () => JSON.parse((await request('/api/activity')).body);
  assert.deepEqual(await data(), {codex:{state:'Live',agents},chatgpt:{state:'Feed unavailable',agents:[]}});
  const now = Date.now;
  Date.now = () => now() + 31000;
  try {
    assert.deepEqual((await data()).codex,{state:'Feed stale',agents:[]});
  } finally {
    Date.now = now;
  }
});

test('maps local agent status without forwarding names or prompts', async () => {
  const {splitAgents} = await import('./bridge.mjs');
  assert.deepEqual(splitAgents({seq:3,agents:{
    a:{source:'codex',status:'working',name:'Private name'},
    b:{source:'codex',status:'done',parent:'a'},
    c:{source:'chatgpt',status:'offline'},
  }}), {codex:[
    {name:'Primary 1',role:'primary',status:'active'},
    {name:'Support 2',role:'support',status:'idle'},
  ],chatgpt:[]});
});
