const floor = document.querySelector('#floor');
const statusLine = document.querySelector('#connection');
const labels = {codex: 'Codex', chatgpt: 'ChatGPT'};
const rooms = [['office','Primary office'], ['conference','Conference room'], ['lounge','Lounge']];
function element(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
function render(feeds) {
  floor.replaceChildren(...Object.entries(labels).map(([key, label]) => {
    const feed = feeds[key];
    const suite = element('section', 'suite', '');
    const header = element('header', '', '');
    header.append(element('h2', '', label), element('p', '', feed.state));
    suite.append(header);
    for (const [room, title] of rooms) {
      const area = element('section', 'room ' + room, '');
      const furniture = element('div', 'furniture', '');
      furniture.setAttribute('aria-hidden', 'true');
      const agents = element('div', 'agents', '');
      for (const agent of feed.agents) {
        const location = agent.status === 'idle' ? 'lounge' : agent.role === 'primary' ? 'office' : 'conference';
        if (location === room) agents.append(element('span', 'agent', agent.name + ' · ' + agent.status));
      }
      if (!agents.children.length) agents.append(element('p', 'empty', feed.state === 'Live' ? 'Empty' : 'Activity unavailable'));
      area.append(element('h3', '', title), furniture, agents);
      suite.append(area);
    }
    return suite;
  }));
}
const unavailable = {state:'Unavailable',agents:[]};
render({codex:unavailable,chatgpt:unavailable});
async function refresh() {
  try {
    const response = await fetch('/api/activity', {signal: AbortSignal.timeout(4500)});
    if (!response.ok) throw Error('Activity unavailable');
    render(await response.json());
    statusLine.textContent = 'Activity refreshes every five seconds.';
  } catch {
    render({codex:unavailable,chatgpt:unavailable});
    statusLine.textContent = 'Activity server unreachable. Reconnecting…';
  }
  setTimeout(refresh, 5000);
}
refresh();
let angle = -4;
function rotate(delta) {
  angle = Math.max(-24, Math.min(24, angle + delta));
  floor.style.setProperty('--angle', angle + 'deg');
}
document.querySelector('#left').onclick = () => rotate(-8);
document.querySelector('#right').onclick = () => rotate(8);
const view = document.querySelector('#view');
const mobile = matchMedia('(max-width: 720px)');
function setView(flat) {
  document.body.classList.toggle('flat', flat);
  view.setAttribute('aria-pressed', flat);
}
setView(mobile.matches);
mobile.addEventListener('change', event => setView(event.matches));
view.onclick = () => setView(!document.body.classList.contains('flat'));
