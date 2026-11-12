# Agent Floor

Use Node.js 22 or later. Run `npm start` and open http://localhost:3000. Run `node --test` for request-handler tests.

Deploy as a new Render web service with `npm start` and the `/healthz` health check. The server uses Render's PORT variable.

An authorized publisher can POST a complete snapshot to `/api/activity/codex` or `/api/activity/chatgpt` with the corresponding bearer token configured in `CODEX_FEED_TOKEN` or `CHATGPT_FEED_TOKEN`. Send `{"agents":[{"name":"Display alias","role":"support","status":"idle"}]}`. Roles are primary and support. Statuses are active and idle. Publish at least once every 30 seconds, including empty snapshots when a connected suite has no agents.

Snapshots are held in memory and expire after 30 seconds. Anyone with access to the site can read current snapshots. Publish display aliases only. The dashboard does not collect prompts or transcripts. This project does not ship with a publisher configured for your account.

To mirror an existing local Agent Floor that already receives Codex events, run `node bridge.mjs` with AGENT_FLOOR_URL and the same CODEX_FEED_TOKEN as the new Render service. The bridge reads the local /state endpoint on port 4317 by default. Set LOCAL_FLOOR_URL to override the loopback address. It forwards aliases, roles and statuses only. ChatGPT stays unavailable unless a source provides ChatGPT agent records or posts snapshots directly.
