# Render MCP (Cursor)

Manage Render services (deploy backend API, env vars, logs) from Cursor.

## 1. Create a Render API key

1. Open [Render Account Settings → API Keys](https://dashboard.render.com/u/settings#api-keys)
2. Create an API key and copy it (shown once).

## 2. Set the key for Cursor

**Option A — environment variable (recommended)**

Add to your shell profile (`~/.zshrc`):

```bash
export RENDER_API_KEY="rnd_xxxxxxxx"
```

Restart Cursor completely (Quit → reopen).

**Option B — interactive install**

From the repo root:

```bash
npx add-mcp https://mcp.render.com/mcp -a cursor \
  --header "Authorization: Bearer \${RENDER_API_KEY}"
```

You will be prompted for the key; it is stored in your local MCP config, not in git.

## 3. Verify in Cursor

1. Open this repo root in Cursor (so `.cursor/mcp.json` loads).
2. **Settings → MCP** — you should see **render** with tools listed.
3. If it shows an error, check that `RENDER_API_KEY` is set and restart Cursor.

## Config (already in `.cursor/mcp.json`)

```json
"render": {
  "url": "https://mcp.render.com/mcp",
  "headers": {
    "Authorization": "Bearer ${RENDER_API_KEY}"
  }
}
```

Do **not** commit API keys into `mcp.json`; use `${RENDER_API_KEY}` only.

## Docs

- [Render MCP server](https://render.com/docs/mcp-server)
