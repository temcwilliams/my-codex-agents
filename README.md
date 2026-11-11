# My Codex agents

A protected phone viewer for Codex notifications from the connected workspace. This does not track ChatGPT conversations or automatically discover other computers.

[Deploy to Render](https://render.com/deploy?repo=https://github.com/temcwilliams/my-codex-agents)

The Blueprint creates a free Docker web service, with separate generated secrets for viewing and ingesting data. No agent activity is stored in this repository. Free services may sleep while unused and lose in-memory state on restart; the relay refreshes state every ten seconds while the source workspace is running.

## Deployment

1. Open the deployment link, authorize Render to read this private repository, and deploy the Blueprint.
2. Open the resulting service URL. The viewer asks for an access code. Use the service's generated `VIEW_TOKEN` from its Environment settings.
3. Keep `AGENT_VIEWER_URL`, `VIEW_TOKEN` and `INGEST_TOKEN` in the source workspace's ignored `.env.hosting` file with permissions 0600. Do not post tokens into chat.
4. Set the Codex CLI `notify` command to `["node", "--use-env-proxy", "/absolute/path/to/hosting/notify-codex.mjs"]`. Completed turns post directly to the hosted viewer; a running local floor is used when available.
5. Optionally run `hosting/relay.mjs` with its documented environment variables to mirror ongoing local floor activity.

Codex CLI uses the notification hook in `~/.codex/config.toml` and reports completed turns. New sessions must load that configuration. Agents running outside this workspace need their own configuration.

## Validation

`npm test` checks the protocol, adapters, HTTP server and protected hosting gateway. `npm run build` typechecks and builds the web UI.
