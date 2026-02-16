const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-20250514';

function sanitizeMemories(memories) {
    if (!Array.isArray(memories)) {
        return [];
    }

    return memories
        .filter(memory => memory && typeof memory.text === 'string')
        .map(memory => ({
            id: memory.id || `${memory.category || 'memory'}-${memory.createdAt || ''}`,
            category: memory.category || 'other',
            text: memory.text,
            tags: Array.isArray(memory.tags) ? memory.tags : [],
            createdAt: memory.createdAt || null
        }));
}

function extractJsonObject(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('No JSON object found in model response');
    }
    return JSON.parse(match[0]);
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { question, memories } = JSON.parse(event.body || '{}');
        if (typeof question !== 'string' || !question.trim()) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'question is required' }) };
        }

        const safeMemories = sanitizeMemories(memories);
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1600,
            temperature: 0.2,
            system: [
                'You generate gift ideas from a user memory list.',
                'ONLY use provided memories. Never invent facts.',
                'Prefer recurring tags/themes when picking ideas.',
                'Return 5-8 ideas with a mix of budget and effort.',
                'Return STRICT JSON only and exactly this top-level schema:',
                '{"ideas":[{"title":"","why":"","priceRange":"","effort":"low|medium|high","relatedMemories":["memoryIdOrSnippet"]}],"followUps":[""]}'
            ].join('\n'),
            messages: [{
                role: 'user',
                content: JSON.stringify({
                    question,
                    memories: safeMemories
                })
            }]
        });

        const text = response?.content?.[0]?.text || '';
        const parsed = extractJsonObject(text);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
                followUps: Array.isArray(parsed.followUps) ? parsed.followUps : []
            })
        };
    } catch (error) {
        console.error('Gift ideas error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to generate gift ideas' })
        };
    }
};
