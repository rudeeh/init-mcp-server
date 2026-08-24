import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Register all tool definitions and handlers on the MCP server.
 * Add your own tools here — each tool needs:
 *   1. An entry in the `tools` array (name + description + inputSchema)
 *   2. A case in the switch statement inside the handler
 */
export function registerTools(server: Server): void {
  // ── List Tools ──────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'echo',
        description:
          'Returns back whatever text you send. Useful for testing the connection.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            message: {
              type: 'string',
              description: 'The text to echo back',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'add_numbers',
        description:
          'Adds two numbers together and returns the result.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['a', 'b'],
        },
      },
      {
        name: 'get_current_time',
        description:
          'Returns the current UTC date and time as an ISO-8601 string.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
      {
        name: 'reverse_text',
        description:
          'Reverses the given string character-by-character.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            text: {
              type: 'string',
              description: 'The string to reverse',
            },
          },
          required: ['text'],
        },
      },
    ],
  }));

  // ── Call Tool ───────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'echo': {
        const message = (args as { message: string }).message;
        return {
          content: [{ type: 'text', text: `Echo: ${message}` }],
        };
      }

      case 'add_numbers': {
        const { a, b } = args as { a: number; b: number };
        const result = a + b;
        return {
          content: [{ type: 'text', text: `${a} + ${b} = ${result}` }],
        };
      }

      case 'get_current_time': {
        const now = new Date().toISOString();
        return {
          content: [{ type: 'text', text: `Current UTC time: ${now}` }],
        };
      }

      case 'reverse_text': {
        const text = (args as { text: string }).text;
        const reversed = text.split('').reverse().join('');
        return {
          content: [{ type: 'text', text: `Reversed: ${reversed}` }],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  });
}
