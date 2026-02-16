const OpenAI = require('openai');

const EMBEDDING_MODEL = 'text-embedding-3-small';

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

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: inputs
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                vectors: response.data.map(item => item.embedding)
            })
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
