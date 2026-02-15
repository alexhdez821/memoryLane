// Netlify serverless function for Claude API integration
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { message, memories } = JSON.parse(event.body);

        // Initialize Anthropic client with API key from environment variable
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        // Build the memory database context
        const memoryContext = buildMemoryContext(memories);

        // Create the system prompt
        const systemPrompt = `You are a helpful assistant with access to a personal database of things someone's fiancée has mentioned. Use this database to answer questions thoughtfully and helpfully.

${memoryContext}

When answering:
- Reference specific memories when relevant
- Be conversational and warm
- If you don't have information about something, say so
- Suggest ideas based on the memories you have
- Help think through gift ideas, date plans, etc. based on her interests`;

        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: message
                }
            ]
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: response.content[0].text
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process request',
                details: error.message
            })
        };
    }
};

function buildMemoryContext(memories) {
    if (!memories || memories.length === 0) {
        return "Memory Database: (empty - no memories recorded yet)";
    }

    // Group memories by category
    const grouped = {};
    memories.forEach(memory => {
        if (!grouped[memory.category]) {
            grouped[memory.category] = [];
        }
        grouped[memory.category].push(memory);
    });

    // Build formatted context
    let context = "Memory Database:\n\n";
    
    for (const [category, items] of Object.entries(grouped)) {
        context += `${category.toUpperCase()}:\n`;
        items.forEach((item, index) => {
            context += `${index + 1}. ${item.text}`;
            if (item.tags && item.tags.length > 0) {
                context += ` [Tags: ${item.tags.join(', ')}]`;
            }
            context += `\n`;
        });
        context += `\n`;
    }

    return context;
}
