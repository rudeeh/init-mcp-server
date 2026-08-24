# my-mcp-server

A cloud-deployable **Model Context Protocol (MCP)** server using Express + SSE transport. Ready to deploy on Render (free tier) and connect to Gemini as a custom connected app.

## Included Tools

| Tool | Description |
|------|-------------|
| `echo` | Returns back the input text (connection test) |
| `add_numbers` | Adds two numbers |
| `get_current_time` | Returns current UTC time as ISO-8601 |
| `reverse_text` | Reverses a string |

Add your own tools in `src/tools.ts`.

## Local Development

```bash
npm install
npm run dev          # starts with tsx (hot reload)
```

Test the SSE endpoint:

```bash
curl http://localhost:3000/health
```

## Deploy to Render

### Option A — One-click via `render.yaml`

1. Push this repo to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your GitHub repo — Render reads `render.yaml` automatically.
4. Click **Apply**.

### Option B — Manual

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub repo.
3. Set the following:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Click **Create Web Service**.

Once deployed, your HTTPS URL will look like:

```
https://my-mcp-server-xxxx.onrender.com
```

## Connect to Gemini

1. Open Gemini → **Settings** → **Extensions** → **Set up a custom connected app**.
2. Paste your SSE endpoint:
   ```
   https://my-mcp-server-xxxx.onrender.com/sse
   ```
3. Click **Next** to verify and connect.

Gemini will discover the available tools and can call them in conversation.

## Project Structure

```
├── src/
│   ├── index.ts      # Express server + SSE transport setup
│   └── tools.ts      # Tool definitions and handlers
├── render.yaml        # Render deployment config
├── package.json
├── tsconfig.json
└── .gitignore
```

## Adding Your Own Tools

Edit `src/tools.ts`:

1. Add a new entry to the `tools` array in `ListToolsRequestSchema` handler.
2. Add a matching `case` in the `CallToolRequestSchema` switch statement.
3. Rebuild and redeploy.
