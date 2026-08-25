import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function registerTools(server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'echo',
        description: 'Returns back whatever text you send. Useful for testing the connection.',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'The text to echo back' },
          },
          required: ['message'],
        },
      },
      {
        name: 'add_numbers',
        description: 'Adds two numbers together and returns the result.',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
          },
          required: ['a', 'b'],
        },
      },
      {
        name: 'get_current_time',
        description: 'Returns the current UTC date and time as an ISO-8601 string.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'reverse_text',
        description: 'Reverses the given string character-by-character.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The string to reverse' },
          },
          required: ['text'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'echo': {
        const message = args.message;
        return { content: [{ type: 'text', text: `Echo: ${message}` }] };
      }
      case 'add_numbers': {
        const { a, b } = args;
        return { content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }] };
      }
      case 'get_current_time': {
        return { content: [{ type: 'text', text: `Current UTC time: ${new Date().toISOString()}` }] };
      }
      case 'reverse_text': {
        const text = args.text;
        return { content: [{ type: 'text', text: `Reversed: ${text.split('').reverse().join('')}` }] };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  });
}
