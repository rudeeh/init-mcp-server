# init-mcp-server

A cloud-deployable **Model Context Protocol (MCP)** server using Express + SSE transport.
Ready to deploy on Render (free tier) and connect to Gemini as a custom connected app.

## Included Tools

| Tool | Description |
|------|-------------|
| `echo` | Returns back the input text (connection test) |
| `add_numbers` | Adds two numbers |
| `get_current_time` | Returns current UTC time as ISO-8601 |
| `reverse_text` | Reverses a string |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Deploy to Render

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) -> **New** -> **Blueprint**
3. Connect the repo and click **Apply** (render.yaml handles the rest)
4. Copy your HTTPS URL and connect to Gemini at `/sse`

## Connect to Gemini

1. Open Gemini -> Settings -> Connected Apps
2. Add custom app link: `https://your-service.onrender.com/sse`
3. Gemini will discover all 4 tools automatically

## Project Structure

```
src/
  index.ts      # Express server + SSE transport
  tools.ts      # Tool definitions and handlers
render.yaml     # Render deployment config
package.json
tsconfig.json
```

## Adding Your Own Tools

Edit `src/tools.ts`:
1. Add a new entry to the `tools` array
2. Add a matching `case` in the switch statement
3. Rebuild and redeploy
