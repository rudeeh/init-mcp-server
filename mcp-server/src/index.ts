import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTools } from './tools.js';

const app = express();
app.use(express.json());

// Create the MCP server instance
const server = new Server(
  { name: 'my-mcp-server', version: '1.0.0' },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tool handlers
registerTools(server);

// Track active SSE transports per client
const transports = new Map<string, SSEServerTransport>();

// SSE endpoint — Gemini (or any MCP client) connects here
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  const clientId = crypto.randomUUID();
  transports.set(clientId, transport);

  // Clean up when the client disconnects
  req.on('close', () => {
    transports.delete(clientId);
  });

  await server.connect(transport);
  console.log(`[SSE] Client ${clientId} connected`);
});

// Message endpoint — receives JSON-RPC messages from the client
app.post('/message', async (req, res) => {
  // Route to the most recently connected transport
  // (single-client setup — scale with Redis for multi-client)
  const transport = Array.from(transports.values()).pop();
  if (!transport) {
    res.status(400).json({ error: 'No active SSE connection' });
    return;
  }
  await transport.handlePostMessage(req, res);
});

// Health check (useful for Render monitoring)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', clients: transports.size });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server listening on port ${PORT}`);
  console.log(`SSE endpoint:  http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/message`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
