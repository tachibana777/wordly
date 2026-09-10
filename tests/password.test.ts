import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, validatePassword, verifyPassword } from '../src/server/password';
test('password policy allows long passphrases, spaces and Unicode, without silently trimming', () => {
  for(const value of ['a memorable phrase for learning','ภาษาไทยใช้เป็นรหัสผ่านได้เลย','🙂'.repeat(15),'a'.repeat(128)]) assert.doesNotThrow(()=>validatePassword(value));
  for(const value of [null,{},'', 'a'.repeat(14),'a'.repeat(129),' '.repeat(20)]) assert.throws(()=>validatePassword(value));
});
test('passwords use unique salts and scrypt, verify exactly and reject malformed hashes', async () => {
  const password='a memorable phrase for learning';
  const first=await hashPassword(password); const second=await hashPassword(password);
  assert.match(first,/^\$scrypt\$131072\$8\$1\$/); assert.notEqual(first,second); assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password,first),true);
  assert.equal(await verifyPassword(password+' ',first),false);
  assert.equal(await verifyPassword('a different phrase for learning',first),false);
  assert.equal(await verifyPassword(password,null),false);
  assert.equal(await verifyPassword(password,'$scrypt$999999999$8$1$abc$def'),false);
});
