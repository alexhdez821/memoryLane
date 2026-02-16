// Netlify serverless function for semantic vectors via Anthropic
const Anthropic = require('@anthropic-ai/sdk');

const VECTOR_DIMENSIONS = 128;
const EMBEDDING_MODEL = 'claude-semantic-v1';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

function extractJsonObject(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('No JSON object found in model response');
    }
    return JSON.parse(match[0]);
}

function normalizeVector(vector) {
    if (!Array.isArray(vector)) {
        return null;
    }

    const asNumbers = vector.map(value => Number(value));
    if (asNumbers.some(value => Number.isNaN(value) || !Number.isFinite(value))) {
        return null;
    }

    if (asNumbers.length === VECTOR_DIMENSIONS) {
        return asNumbers;
    }

    if (asNumbers.length > VECTOR_DIMENSIONS) {
        return asNumbers.slice(0, VECTOR_DIMENSIONS);
    }

    return [...asNumbers, ...Array(VECTOR_DIMENSIONS - asNumbers.length).fill(0)];
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
        const { inputs } = JSON.parse(event.body || '{}');

        if (!Array.isArray(inputs) || !inputs.length || !inputs.every(item => typeof item === 'string')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'inputs must be a non-empty array of strings' })
            };
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 3500,
            temperature: 0,
            system: `You convert text inputs into semantic vectors.
Return STRICT JSON only with this shape:
{"model":"${EMBEDDING_MODEL}","vectors":[[number,...],[number,...]]}
Rules:
- Return exactly one vector per input, same order.
- Each vector MUST contain exactly ${VECTOR_DIMENSIONS} numeric values.
- Values should be floats typically in range [-1, 1].
- No markdown, no commentary.`,
            messages: [{
                role: 'user',
                content: JSON.stringify({ inputs })
            }]
        });

        const text = response?.content?.[0]?.text || '';
        const parsed = extractJsonObject(text);
        const vectors = Array.isArray(parsed.vectors)
            ? parsed.vectors.map(normalizeVector)
            : [];

        if (vectors.length !== inputs.length || vectors.some(vector => !vector)) {
            throw new Error('Invalid vector output from model');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ vectors, model: EMBEDDING_MODEL })
        };
    } catch (error) {
        console.error('Embedding error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to generate embeddings' })
        };
    }
};
