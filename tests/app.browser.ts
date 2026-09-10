import { chromium, expect, type Browser, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import { createServer } from 'node:net';
import { vocabulary } from '../src/data/vocabulary';
import { hashToken } from '../src/server/security';

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL and start Docker first.');
  const name = 'wordly_test_' + randomBytes(6).toString('hex');
  const admin = new pg.Client({connectionString: process.env.DATABASE_URL});
  await admin.connect();
  const testUrl = new URL(process.env.DATABASE_URL); testUrl.pathname = '/' + name;
  let client: pg.Client | undefined; let server: ChildProcess | undefined; let browser: Browser | undefined;
  let activePage: Page | undefined;
  const errors: string[] = [];
  const output: string[] = [];
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    client = new pg.Client({connectionString:testUrl.toString()}); await client.connect();
    await client.query(readFileSync('db/001_init.sql','utf8'));
    await client.query(readFileSync('db/002_email_auth.sql','utf8'));
    const probe = createServer();
    await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = (probe.address() as {port:number}).port;
    await new Promise<void>(resolve => probe.close(() => resolve()));
    const origin = `http://localhost:${port}`;
    const env: NodeJS.ProcessEnv = {...process.env, DATABASE_URL:testUrl.toString(), APP_ORIGIN:origin, NODE_ENV:'development', AUTH_SECRET:randomBytes(32).toString('hex'), TRUSTED_IP_HEADER:''};
    if (process.platform === 'win32') Object.assign(env, {NEXT_TEST_WASM_DIR:path.dirname(require.resolve('@next/swc-wasm-nodejs'))});
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', '--hostname','127.0.0.1','--port',String(port)], {env, windowsHide:true, stdio:['ignore','pipe','pipe']});
    server.on('error', error => output.push(error.message));
    const capture = (chunk: Buffer) => {output.push(chunk.toString());};
    server.stdout!.on('data',capture); server.stderr!.on('data',capture);
    await expect.poll(() => output.join('').includes('Ready in'), {timeout:90000, intervals:[1000]}).toBe(true);
    await expect.poll(async () => {
      if (server!.exitCode !== null) throw new Error('Test server exited: ' + output.join(''));
      try {return (await fetch(origin + '/login')).status;} catch {return 0;}
    }, {timeout:180000, intervals:[1000,2000]}).toBe(200);
    console.log('Isolated PostgreSQL test database and Next.js server ready.');
    browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || 'chrome'});
    const context = await browser.newContext({viewport:{width:1440,height:1100}, reducedMotion:'reduce'});
    const page = await context.newPage(); activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    const api = context.request;
    const post = (url: string, data: unknown, requestOrigin = origin) => api.post(origin + url, {data, headers:{origin:requestOrigin}});
    const email = 'learner@example.com';
    const password = 'a memorable learning password';
    const credentials = {email,password,confirmPassword:password};
    const clearCooldown = () => client!.query("UPDATE auth_rate_limits SET expires_at = now() - interval '1 second'");
    await page.goto(origin); await expect(page).toHaveURL(/\/login$/);
    assert.equal((await api.get(origin+'/api/auth/me')).status(),401);
    assert.equal((await post('/api/feedback',{type:'suggestion',name:'',message:'Hello'})).status(),401);
    assert.equal((await post('/api/auth/register',{...credentials,email:'invalid'})).status(),400);
    assert.equal((await post('/api/auth/register',{...credentials,password:'short'})).status(),400);
    assert.equal((await post('/api/auth/register',{...credentials,confirmPassword:'mismatch'})).status(),400);
    assert.equal((await post('/api/auth/login',credentials,'https://attacker.test')).status(),403);
    assert.equal((await api.post(origin+'/api/auth/login',{data:credentials})).status(),403);
    for (const endpoint of ['request-otp','verify-otp']) assert.equal((await post('/api/auth/'+endpoint,{})).status(),404);
    mkdirSync('artifacts',{recursive:true});
    await page.screenshot({path:'artifacts/login-desktop.png',fullPage:true});
    for (const width of [320,375,768]) {await page.setViewportSize({width,height:900}); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Login overflow at ${width}`);}
    await page.screenshot({path:'artifacts/login-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1100});
    await page.getByRole('button',{name:'สมัครสมาชิก',exact:true}).click();
    await page.locator('#email').fill('Learner@Example.com');
    await page.locator('#password').fill(password);
    await page.locator('#confirm-password').fill('mismatched password');
    await page.locator('.auth-submit').click();
    await expect(page.getByRole('alert')).toContainText('ไม่ตรงกัน');
    await page.locator('#confirm-password').fill(password);
    await page.getByRole('button',{name:'แสดงรหัสผ่าน',exact:true}).click();
    await expect(page.locator('#password')).toHaveAttribute('type','text');
    await page.locator('.auth-submit').click();
    await expect(page.locator('#word-display')).toBeVisible({timeout:60000});
    const me = await (await api.get(origin+'/api/auth/me')).json();
    const firstUserId = me.user.id; assert.equal(me.user.email,email); assert.equal('password_hash' in me.user,false);
    assert.equal(Number((await client.query('SELECT count(*) FROM users')).rows[0].count),1);
    const cookie = (await context.cookies()).find(c => c.name==='wordly_session')!;
    assert.ok(cookie.httpOnly); assert.equal(cookie.sameSite,'Lax');
    assert.equal((await client.query('SELECT token_hash FROM sessions')).rows[0].token_hash,hashToken(cookie.value));
    assert.equal((await post('/api/auth/register',credentials)).status(),409);
    const storedHash = (await client.query('SELECT password_hash FROM users')).rows[0].password_hash;
    assert.ok(storedHash.startsWith('$scrypt$')); assert.notEqual(storedHash,password);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => [...document.fonts].some(f => f.family==='Noto Sans Thai' && f.status==='loaded')));
    await page.locator('.hint-button').click(); await expect(page.locator('#hint-text')).toBeVisible();
    await expect(page.locator('.answer-area')).toHaveCount(0);
    const initialWord = await page.locator('#word-display').innerText();
    await page.locator('.reveal-button').click(); await page.locator('.practice-button').click();
    await expect(page.locator('#word-display')).not.toHaveText(initialWord);
    await page.locator('[data-mode="review"]').click(); await expect(page.locator('#word-display')).toHaveText(initialWord);
    await page.locator('.reveal-button').click(); await page.locator('.known-button').click();
    await expect(page.locator('.flashcard .empty-state')).toBeVisible();
    await page.getByRole('button',{name:'กลับไปฝึกทุกคำ'}).click();
    await page.reload(); await expect(page.locator('.progress-line.known strong')).toHaveText('1 คำ');
    await expect(page.locator('.goal-ring strong')).toHaveText('2/ 20');
    await page.locator('.skip-button').click(); await expect(page.locator('.goal-ring strong')).toHaveText('2/ 20');
    for (const category of ['office','computer','dev','cyber','hotel','restaurant','daily','travel']) {
      await page.locator('#category-select').selectOption(category);
      await expect(page.locator('.deck-count')).toHaveText('50 คำในชุดนี้');
      const text = await page.locator('#word-display').innerText(); assert.ok(vocabulary.some(w=>w.word===text && w.category===category));
    }
    await page.locator('#category-select').selectOption('all');
    const shown = await page.locator('#word-display').innerText();
    await page.locator('#translation-input').fill(vocabulary.find(w=>w.word===shown)!.meaning);
    await page.locator('.check-answer').click(); await expect(page.locator('.answer-result')).toContainText('1 / 1 คะแนน');
    await page.locator('.next-answer').click(); await page.locator('#word-display').focus();
    await page.keyboard.press('h'); await expect(page.locator('#hint-text')).toBeVisible();
    await page.keyboard.press('Space'); await expect(page.locator('.answer-area')).toBeVisible();
    await page.keyboard.press('2'); await expect(page.locator('.answer-area')).toHaveCount(0);
    await page.locator('[data-page="library"]').click(); await page.locator('.search-field input').fill('ช่องโหว่');
    await expect(page.locator('.library-word h2')).toContainText(['Vulnerability']);
    await page.locator('.search-field input').fill('Brute force'); await page.getByRole('button',{name:'ฝึกคำว่า Brute force'}).click();
    await page.locator('#translation-input').fill('เดารหัสผ่าน'); await page.locator('.check-answer').click();
    await expect(page.locator('.answer-result')).toContainText('0.5 / 1 คะแนน');
    await page.locator('[data-page="library"]').click(); await page.locator('.search-field input').fill('');
    await expect(page.locator('.word-row')).toHaveCount(20); await page.locator('.next-page').click(); await expect(page.locator('.pagination span')).toHaveText('หน้า 2 / 20');
    await page.locator('.search-field input').fill('no-such-vocabulary'); await expect(page.locator('.library-empty')).toBeVisible();
    await page.locator('.clear-filters').click(); await expect(page.locator('.word-row')).toHaveCount(20);
    await page.locator('[data-page="sentences"]').click();
    for (const word of ['I','eat','food']) await page.locator('.sentence-bank').getByRole('button',{name:word,exact:true}).click();
    await page.locator('.sentence-check').click(); await expect(page.locator('.sentence-feedback')).toContainText('ถูกต้อง');
    await page.getByRole('button',{name:'ยาก · พิมพ์เอง'}).click(); await page.locator('#sentence-input').fill('i EAT food!');
    await page.locator('.sentence-check').click(); await expect(page.locator('.sentence-feedback')).toContainText('ถูกต้อง');
    await page.locator('.sentence-next').click(); await page.locator('#sentence-input').fill('Every day she drinks water.');
    await page.locator('.sentence-check').click(); await expect(page.locator('.sentence-feedback')).toContainText('ถูกต้อง');
    await page.locator('[data-page="feedback"]').click();
    const feedbackMessage = '<script>alert(1)</script> ทดสอบ feedback';
    await page.locator('#feedback-message').fill(feedbackMessage); await page.getByRole('button',{name:'ส่งความคิดเห็น',exact:true}).click();
    await expect(page.locator('.feedback-status')).toContainText('เรียบร้อย'); await expect(page.locator('#feedback-message')).toHaveValue('');
    const saved = (await client.query('SELECT user_id,message FROM feedback')).rows[0]; assert.equal(saved.user_id,firstUserId); assert.equal(saved.message,feedbackMessage);
    await page.locator('[data-page="practice"]').click(); await page.screenshot({path:'artifacts/practice-desktop.png',fullPage:true});
    for (const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:1000});
      for (const section of ['practice','library','sentences','progress','feedback']) {
        await page.locator(`[data-page="${section}"]`).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section} overflow at ${width}`);
      }
    }
    await page.setViewportSize({width:375,height:900}); await page.locator('[data-page="practice"]').click();
    await page.screenshot({path:'artifacts/practice-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click(); await expect(page).toHaveURL(/\/login$/);
    assert.equal((await api.get(origin+'/api/auth/me')).status(),401);
    assert.equal((await api.get(origin+'/api/auth/me',{headers:{cookie:`wordly_session=${cookie.value}`}})).status(),401,'Logout revokes the server session');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('incorrect password');
    await page.locator('.auth-submit').click();
    await expect(page.getByRole('alert')).toContainText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await page.locator('#password').fill(password);
    await page.locator('.auth-submit').click();
    await expect(page.locator('#word-display')).toBeVisible();
    assert.equal((await (await api.get(origin+'/api/auth/me')).json()).user.id,firstUserId);
    assert.equal(Number((await client.query('SELECT count(*) FROM users')).rows[0].count),1);
    await page.goto(origin); await expect(page.locator('.progress-line.known strong')).not.toHaveText('0 คำ');
    await post('/api/auth/logout',{});
    const secondCredentials = {...credentials,email:'second@example.com'};
    const results = await Promise.all([post('/api/auth/register',secondCredentials),post('/api/auth/register',secondCredentials)]);
    assert.deepEqual(results.map(r=>r.status()).sort(),[201,409],'Concurrent registration creates one account');
    await page.goto(origin); await expect(page.locator('.progress-line.known strong')).toHaveText('0 คำ');
    await page.evaluate(() => localStorage.setItem('wordly.progress.v1',JSON.stringify({records:{'office-2':{status:'known'}},activity:{},category:'office'})));
    await page.reload(); await page.getByRole('button',{name:'นำเข้าข้อมูลเดิม'}).click();
    await expect(page.locator('.progress-line.known strong')).toHaveText('1 คำ'); await page.reload(); await expect(page.locator('.import-banner')).toHaveCount(0);
    const secondUser = (await (await api.get(origin+'/api/auth/me')).json()).user;
    await page.evaluate(id => localStorage.setItem(`wordly.progress.v2.${id}`, '{corrupt'), secondUser.id);
    await page.reload(); await expect(page.locator('#word-display')).toBeVisible();
    await post('/api/auth/logout',{});
    await clearCooldown();
    for (let i=0;i<10;i++) assert.equal((await post('/api/auth/login',{email,password:'incorrect password'})).status(),401);
    const limited = await post('/api/auth/login',credentials);
    assert.equal(limited.status(),429); assert.ok(limited.headers()['retry-after']);
    await clearCooldown();
    assert.equal((await post('/api/auth/login',credentials)).status(),200);
    await client.query("UPDATE sessions SET expires_at=now() - interval '1 second'");
    assert.equal((await api.get(origin+'/api/auth/me')).status(),401,'Expired session is refused');
    assert.deepEqual(errors,[]);
    console.log('PASS: registration, returning login, password validation, duplicate registration, login rate limits, CSRF, cookie/session revocation, account isolation, legacy import, 400-word study, sentences, feedback and responsive layouts.');
  } catch (error) {
    console.error('Browser errors:', errors);
    console.error('Server output:', output.join('').slice(-7000));
    await activePage?.screenshot({path:'artifacts/test-failure.png',fullPage:true}).catch(()=>{});
    throw error;
  } finally {
    await browser?.close();
    if (server?.pid) {
      if (process.platform==='win32') {try {execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});} catch {}}
      else server.kill('SIGTERM');
    }
    await client?.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); await admin.end();
  }
}
main().catch(error=>{console.error(error); process.exitCode=1;});
