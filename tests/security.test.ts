import test from 'node:test';
import assert from 'node:assert/strict';
import { authConfig } from '../src/server/config';
import { normalizeEmail, allowedOrigin, readBody, ApiError } from '../src/server/security';
import { cleanProgress, createStorage } from '../src/lib/storage';
import { sentences, sentenceAnswers } from '../src/data/sentences';
process.env.AUTH_SECRET = 'test-only-secret-not-for-production-000000';
process.env.APP_ORIGIN = 'http://localhost:4173';
test('normalizes email case and whitespace without changing aliases or accepting malformed addresses', () => {
  assert.equal(normalizeEmail('  Learner+one@Example.COM  '), 'learner+one@example.com');
  for (const value of ['',null,{},'no-at-sign','.abc@example.com','a..b@example.com','a@-example.com','a@example..com','a@localhost','a@b@c.com','a\n@example.com','a'.repeat(65)+'@example.com']) assert.throws(()=>normalizeEmail(value),ApiError);
});
test('public deployments require HTTPS; loopback aliases work only on the configured port', () => {
  assert.equal(allowedOrigin('http://127.0.0.1:4173'),true);
  assert.equal(allowedOrigin('http://localhost:4174'),false);
  assert.equal(allowedOrigin('http://localhost.attacker.com:4173'),false);
  process.env.APP_ORIGIN='https://example.com'; assert.equal(authConfig().secure,true);
  assert.equal(allowedOrigin('https://evil.example.com'),false);
  assert.equal(allowedOrigin('http://127.0.0.1:4173'),false);
  process.env.APP_ORIGIN='http://example.com'; assert.throws(authConfig);
  process.env.APP_ORIGIN='http://localhost:4173'; assert.equal(authConfig().secure,false);
});
test('rejects cross-origin, missing origin, malformed JSON and oversized bodies', async () => {
  const headers = {'content-type': 'application/json', origin: 'http://localhost:4173'};
  assert.deepEqual(await readBody(new Request('http://localhost:4173/api', {method:'POST', headers, body:'{"email":"user@example.com"}'})), {email:'user@example.com'});
  await assert.rejects(readBody(new Request('http://localhost:4173/api',{method:'POST',headers:{...headers,'sec-fetch-site':'cross-site'},body:'{}'})),{status:403});
  for (const origin of ['http://attacker.test', 'null', '']) await assert.rejects(readBody(new Request('http://localhost:4173/api', {method:'POST', headers:{...headers, origin}, body:'{}'})), {status:403});
  for (const body of ['{broken','null','[]']) await assert.rejects(readBody(new Request('http://localhost:4173/api', {method:'POST', headers, body})), {status:400});
  await assert.rejects(readBody(new Request('http://localhost:4173/api', {method:'POST', headers, body:JSON.stringify({text:'a'.repeat(17000)})})), {status:413});
});
test('account storage is isolated and legacy import preserves current records and activity', () => {
  const values = new Map<string, string>();
  const local = {getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => {values.set(key, value);}};
  const alice = createStorage('alice', local); const bob = createStorage('bob', local);
  alice.rate('office-1', 'known'); assert.equal(bob.state.records['office-1'], undefined);
  const day = Object.keys(alice.state.activity)[0];
  alice.importLegacy({records:{'office-1':{status:'practice'},'office-2':{status:'known'}},activity:{[day]:4,'2026-01-01':2}});
  assert.equal(alice.state.records['office-1'].status,'known'); assert.equal(alice.state.records['office-2'].status,'known');
  assert.equal(alice.state.activity[day],4); alice.rate('office-1','known');
  alice.importLegacy({activity:{[day]:2}}); assert.equal(alice.state.activity[day],5);
  assert.deepEqual(cleanProgress({records:{'__proto__':{status:'known'}}}).records, {});
});
test('sentence answers accept all prepared alternatives, punctuation and contractions', () => {
  assert.equal(sentences.length,20);
  for (const item of sentences) {
    for (const answer of [item.answer,...item.alternatives]) assert.ok(sentenceAnswers.check(item, answer.toUpperCase() + '!'));
    assert.equal(!!sentenceAnswers.check(item, ''),false);
    assert.equal(!!sentenceAnswers.check(item, 'unrelated words'),false);
  }
});
