// Netlify serverless function for Claude API integration
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';
const ROUTER_MODEL = 'claude-3-5-haiku-20241022';

exports.handler = async (event) => {
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
        const { message, memories, chatHistory = [] } = JSON.parse(event.body || '{}');

        if (typeof message !== 'string' || !message.trim()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'message is required' })
            };
        }

        // Initialize Anthropic client with API key from environment variable
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        const intent = await classifyIntent(anthropic, message);
        const retrievedMemories = intent === 'WORLD'
            ? []
            : retrieveRelevantMemories(message, memories);

        const sufficiency = intent === 'WORLD'
            ? 'NOT_NEEDED'
            : await checkRetrievalSufficiency(anthropic, message, retrievedMemories);

        const mode = resolveMode(intent, sufficiency);
        const memoryContext = buildMemoryContext(retrievedMemories);

        const systemPrompt = buildSystemPrompt({
            mode,
            memoryContext,
            originalIntent: intent,
            sufficiency
        });

        // Call Claude API
        const conversation = buildConversation(chatHistory, message);

        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1000,
            system: systemPrompt,
            messages: conversation
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: getTextFromResponse(response)
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

async function classifyIntent(anthropic, message) {
    try {
        const response = await anthropic.messages.create({
            model: ROUTER_MODEL,
            max_tokens: 10,
            temperature: 0,
            system: [
                'Classify the user request into one label:',
                '- MEMORY: asks for known personal details/preferences already in saved memories',
                '- WORLD: asks for general world knowledge, local businesses, or info outside saved memories',
                '- HYBRID: asks for ideas/plans/recommendations that should combine saved preferences with world knowledge',
                'Respond with exactly one token: MEMORY or WORLD or HYBRID.'
            ].join('\n'),
            messages: [{
                role: 'user',
                content: message
            }]
        });

        const label = getTextFromResponse(response).trim().toUpperCase();
        if (['MEMORY', 'WORLD', 'HYBRID'].includes(label)) {
            return label;
        }
    } catch (error) {
        console.warn('Intent classification failed, defaulting to HYBRID:', error.message);
    }

    return 'HYBRID';
}

async function checkRetrievalSufficiency(anthropic, message, memories) {
    if (!Array.isArray(memories) || !memories.length) {
        return 'NOT_ENOUGH';
    }

    try {
        const memoryDigest = memories
            .slice(0, 15)
            .map((memory, index) => `${index + 1}. [${memory.category}] ${memory.text}`)
            .join('\n');

        const response = await anthropic.messages.create({
            model: ROUTER_MODEL,
            max_tokens: 10,
            temperature: 0,
            system: [
                'You evaluate whether retrieved memories are enough to answer a user question.',
                'Respond ONLY with ENOUGH or NOT_ENOUGH.'
            ].join('\n'),
            messages: [{
                role: 'user',
                content: `Question:\n${message}\n\nRetrieved memories:\n${memoryDigest}\n\nDo these memories contain enough info to answer the question?`
            }]
        });

        const verdict = getTextFromResponse(response).trim().toUpperCase();
        if (verdict === 'ENOUGH' || verdict === 'NOT_ENOUGH') {
            return verdict;
        }
    } catch (error) {
        console.warn('Sufficiency check failed, defaulting to NOT_ENOUGH:', error.message);
    }

    return 'NOT_ENOUGH';
}

function resolveMode(intent, sufficiency) {
    if (intent === 'MEMORY' && sufficiency === 'NOT_ENOUGH') {
        return 'WORLD';
    }

    if (intent === 'WORLD') {
        return 'WORLD';
    }

    return 'HYBRID';
}

function retrieveRelevantMemories(message, memories, limit = 30) {
    if (!Array.isArray(memories) || memories.length === 0) {
        return [];
    }

    const queryTerms = tokenize(message);

    const ranked = memories
        .filter(memory => memory && typeof memory.text === 'string' && memory.text.trim())
        .map(memory => {
            const haystack = [
                memory.text,
                memory.category || '',
                ...(Array.isArray(memory.tags) ? memory.tags : [])
            ].join(' ').toLowerCase();

            let score = 0;
            for (const term of queryTerms) {
                if (haystack.includes(term)) {
                    score += 1;
                }
            }

            const createdAt = new Date(memory.date || 0).getTime() || 0;
            return { memory, score, createdAt };
        })
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.createdAt - a.createdAt;
        });

    const hasMatched = ranked.some(item => item.score > 0);
    const selected = hasMatched
        ? ranked.filter(item => item.score > 0).slice(0, limit)
        : ranked.slice(0, Math.min(limit, 12));

    return selected.map(item => item.memory);
}

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 3);
}

function buildSystemPrompt({ mode, memoryContext, originalIntent, sufficiency }) {
    return [
        'You are a helpful assistant with access to a personal memory database about the user\'s fiancée.',
        '',
        'Core behavior:',
        '- Use memories when relevant.',
        '- If memories are insufficient, provide helpful general suggestions.',
        '- Do not repeatedly restate memory entries when they do not answer the question.',
        '- Never pretend a business recommendation came from memory unless explicitly stored.',
        '- Be conversational, practical, and warm.',
        '',
        `Routing mode: ${mode}`,
        `Original intent: ${originalIntent}`,
        `Memory sufficiency: ${sufficiency}`,
        '',
        mode === 'WORLD'
            ? 'For this answer, prioritize general world knowledge and practical recommendations. Mention memory limitations only if directly helpful.'
            : 'For this answer, incorporate relevant memory details naturally, then supplement with useful general knowledge where helpful.',
        '',
        memoryContext
    ].join('\n');
}

function buildConversation(chatHistory, latestMessage) {
    const validHistory = Array.isArray(chatHistory)
        ? chatHistory.filter(entry => (
            entry &&
            ['user', 'assistant'].includes(entry.role) &&
            typeof entry.content === 'string' &&
            entry.content.trim()
        ))
        : [];

    const conversation = validHistory.map(entry => ({
        role: entry.role,
        content: entry.content
    }));

    conversation.push({
        role: 'user',
        content: latestMessage
    });

    return conversation;
}

function buildMemoryContext(memories) {
    if (!memories || memories.length === 0) {
        return 'Memory Database: (no relevant memories retrieved)';
    }

    const grouped = {};
    memories.forEach(memory => {
        const category = memory.category || 'other';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(memory);
    });

    let context = 'Memory Database:\n\n';

    for (const [category, items] of Object.entries(grouped)) {
        context += `${category.toUpperCase()}:\n`;
        items.forEach((item, index) => {
            context += `${index + 1}. ${item.text}`;
            if (item.tags && item.tags.length > 0) {
                context += ` [Tags: ${item.tags.join(', ')}]`;
            }
            context += '\n';
        });
        context += '\n';
    }

    return context;
}

function getTextFromResponse(response) {
    if (!response || !Array.isArray(response.content)) {
        return '';
    }

    return response.content
        .filter(item => item && item.type === 'text' && typeof item.text === 'string')
        .map(item => item.text)
        .join('\n')
        .trim();
}
