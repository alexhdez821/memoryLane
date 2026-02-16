const OpenAI = require('openai');

const MODEL = 'gpt-4.1-mini';

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
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = [
            'You are an assistant that generates gift ideas.',
            'ONLY use facts from the provided memories. Do not invent details.',
            'Prefer ideas grounded in recurring themes and tags.',
            'Return 5-8 ideas with diverse effort and price ranges.',
            'Output STRICT JSON only, no markdown.',
            'Required schema:',
            '{"ideas":[{"title":"","why":"","priceRange":"","effort":"low|medium|high","relatedMemories":["memoryIdOrSnippet"]}],"followUps":[""]}',
            `Question: ${question}`,
            `Memories: ${JSON.stringify(safeMemories)}`
        ].join('\n');

        const response = await client.responses.create({
            model: MODEL,
            input: prompt
        });

        const text = response.output_text || '';
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
