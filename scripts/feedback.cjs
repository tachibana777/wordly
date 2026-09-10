const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = function createFeedbackHandler(file) {
    let queue = Promise.resolve();
    return async function handleFeedback(request, response) {
        const reply = (status, message) => {
            response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ message }));
        };
        if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return reply(405, 'Method not allowed'); }
        if (request.headers.origin) {
            try {
                if (new URL(request.headers.origin).host !== request.headers.host) return reply(403, 'Origin not allowed');
            } catch { return reply(403, 'Origin not allowed'); }
        }
        if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') return reply(415, 'Expected JSON');
        try {
            let size = 0;
            const chunks = [];
            for await (const chunk of request) {
                size += chunk.length;
                if (size > 16384) { reply(413, 'Message too large'); return; }
                chunks.push(chunk);
            }
            let data;
            try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, 'Invalid JSON'); }
            if (!data || typeof data.message !== 'string' || typeof data.name !== 'string' ||
                !['suggestion', 'bug', 'content', 'other'].includes(data.type) ||
                !data.message.trim() || data.message.length > 2000 || data.name.length > 80) return reply(400, 'Invalid feedback');
            const entry = { id: randomUUID(), createdAt: new Date().toISOString(), type: data.type, name: data.name.trim(), message: data.message.trim() };
            const write = queue.then(async () => {
                await fs.mkdir(path.dirname(file), { recursive: true });
                await fs.appendFile(file, JSON.stringify(entry) + '\n', 'utf8');
            });
            queue = write.catch(() => {});
            await write;
            reply(201, 'Feedback saved');
        } catch { if (!response.headersSent) reply(500, 'Unable to save feedback'); }
    };
};
