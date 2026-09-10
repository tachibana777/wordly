const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const createHandler = require('../scripts/feedback.cjs');

(async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wordly-feedback-'));
    const file = path.join(directory, 'feedback.jsonl');
    const handler = createHandler(file);
    const root = path.resolve(__dirname, '..');
    const server = http.createServer(async (req, res) => {
        if (req.url === '/api/feedback') return handler(req, res);
        try {
            const target = req.url === '/' ? '/index.html' : req.url;
            const body = await fs.readFile(path.join(root, target));
            res.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : 'text/html');
            res.end(body);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        const post = (body, headers = {}) => fetch(url + '/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
        assert.equal((await post({ type: 'bug', name: '', message: '   ' })).status, 400);
        assert.equal((await post({ type: 'bug', name: '', message: 'x'.repeat(2001) })).status, 400);
        assert.equal((await post({ type: 'bug', name: '', message: 'test' }, { Origin: 'https://example.com' })).status, 403);
        assert.equal((await fetch(url + '/api/feedback')).status, 405);
        browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url + '/#feedback');
        await page.locator('#feedback-message').fill('อยากให้เพิ่มบทเรียนสัมภาษณ์งาน <script>alert(1)</script>');
        await page.locator('.feedback-form [type=submit]').click();
        await page.getByText('ส่งความคิดเห็นแล้ว ขอบคุณที่ช่วยให้ Wordly ดีขึ้น!', { exact: true }).waitFor();
        const entries = (await fs.readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
        assert.equal(entries.length, 1);
        assert.equal(entries[0].name, '');
        assert.match(entries[0].message, /สัมภาษณ์งาน/);
        assert.equal(await page.locator('#feedback-message').inputValue(), '');
        await page.route('**/api/feedback', route => route.fulfill({ status: 500, body: '{}' }));
        await page.locator('#feedback-message').fill('ข้อความที่ต้องเก็บไว้เมื่อส่งไม่สำเร็จ');
        await page.locator('.feedback-form [type=submit]').click();
        await page.getByText('ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้ง ข้อความของคุณยังอยู่ในช่องเดิม', { exact: true }).waitFor();
        assert.equal(await page.locator('#feedback-message').inputValue(), 'ข้อความที่ต้องเก็บไว้เมื่อส่งไม่สำเร็จ');
        await page.setViewportSize({ width: 320, height: 800 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
        console.log('PASS: feedback persistence, validation, private API, successful submit, failure preserves text, mobile layout.');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
        await fs.rm(directory, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
