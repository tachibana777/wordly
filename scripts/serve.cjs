const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const feedback = require('./feedback.cjs')(path.join(root, 'data', 'feedback.jsonl'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end('Bad request'); return; }
    if (pathname === '/api/feedback') { void feedback(request, response); return; }
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative !== 'index.html' && !/^(src|assets)[\\/]/.test(relative)) {
        response.writeHead(403); response.end('Forbidden'); return;
    }
    fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404); response.end('Not found'); return; }
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        response.end(data);
    });
});
const port = Number(process.env.PORT) || 4173;
server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.error(`พอร์ต ${port} ถูกใช้งานอยู่ เปิด http://localhost:${port} หรือกด Ctrl+C ในเทอร์มินัลที่รันเซิร์ฟเวอร์เดิมก่อน`);
    } else {
        console.error(`เปิดเซิร์ฟเวอร์ไม่ได้: ${error.message}`);
    }
    process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Wordly: http://localhost:${server.address().port}\nหยุดเซิร์ฟเวอร์ด้วย Ctrl+C`));
