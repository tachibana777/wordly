import test from 'node:test';
import assert from 'node:assert/strict';
import { authConfig } from '../src/server/config';
import { db } from '../src/server/db';
import { allowedOrigin } from '../src/server/security';

test('Vercel origin selection, HTTPS and required database configuration', () => {
  const previous = {...process.env};
  try {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    process.env.AUTH_SECRET = 'test-only-secret-not-for-production-000000';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'learn.example.com';
    process.env.VERCEL_URL = 'learn-preview.vercel.app';
    delete process.env.APP_ORIGIN;
    assert.equal(authConfig().origin, 'https://learn.example.com');
    assert.equal(authConfig().secure, true);
    assert.equal(allowedOrigin('https://attacker.vercel.app'), false);
    process.env.VERCEL_ENV = 'preview';
    assert.equal(authConfig().origin, 'https://learn-preview.vercel.app');
    assert.equal(allowedOrigin('https://learn.example.com'), false);
    process.env.APP_ORIGIN = 'https://custom.example.com';
    assert.equal(authConfig().origin, 'https://custom.example.com');
    for (const value of ['http://localhost:4173', 'http://example.com', 'invalid', 'https://example.com/path']) {
      process.env.APP_ORIGIN = value;
      assert.throws(authConfig);
    }
    delete process.env.APP_ORIGIN;
    delete process.env.VERCEL_URL;
    assert.throws(authConfig, {code: 'APP_ORIGIN_MISSING'});
    delete process.env.AUTH_SECRET;
    assert.throws(authConfig, {code: 'AUTH_SECRET_INVALID'});
    delete process.env.DATABASE_URL;
    assert.throws(db, {code: 'DATABASE_URL_MISSING'});
    process.env.DATABASE_URL = 'postgresql://user:password@127.0.0.1:5433/wordly';
    assert.throws(db, {code: 'DATABASE_URL_LOCAL_ON_VERCEL'});
    process.env.DATABASE_URL = 'invalid';
    assert.throws(db, {code: 'DATABASE_URL_INVALID'});
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
