import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, exportSPKI } from 'jose';
import { createClerkVerifier, createDemoVerifier, issuerFromPublishableKey } from '../src/middleware/auth.js';
import { loadConfig, validateConfig } from '../src/config.js';
import { startApp } from './helpers.js';

const ISS = 'https://clerk.example.accounts.dev';
const good = await generateKeyPair('RS256'), other = await generateKeyPair('RS256');
const pem = await exportSPKI(good.publicKey);
const cfg = (x = {}) => loadConfig({ authMode: 'clerk', clerkJwtKey: pem, clerkIssuer: ISS, ...x });
const sign = (claims = {}, { key = good.privateKey, sub = 'user_abc123', iss = ISS, exp = '5m', alg = 'RS256' } = {}) => {
  let j = new SignJWT(claims).setProtectedHeader({ alg }).setIssuedAt().setIssuer(iss); if (sub) j = j.setSubject(sub);
  return j.setExpirationTime(exp).sign(key);
};

test('accepts a valid Clerk-style RS256 session token and returns the user id', async () => {
  const v = await createClerkVerifier(cfg());
  assert.equal((await v(await sign())).userId, 'user_abc123');
});

test('rejects expired, wrongly signed, wrong-issuer, subject-less and non-RS256 tokens', async () => {
  const v = await createClerkVerifier(cfg());
  await assert.rejects(async () => v(await sign({}, { exp: Math.floor(Date.now() / 1000) - 120 })), /exp/i);
  await assert.rejects(async () => v(await sign({}, { key: other.privateKey })));                                  // forged signature
  await assert.rejects(async () => v(await sign({}, { iss: 'https://evil.example.com' })));
  await assert.rejects(async () => v(await sign({}, { sub: null })), /subject/);
  await assert.rejects(async () => v(await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('user_x').setIssuer(ISS).setExpirationTime('5m').sign(new TextEncoder().encode('secret-secret-secret-secret-1234'))));
  const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'user_x', iss: ISS, exp: 9999999999 })).toString('base64url')}.`;
  await assert.rejects(() => v(none));                                                                              // alg=none attack
  await assert.rejects(() => v('garbage')); 
});

test('authorised-party (azp) is enforced when configured', async () => {
  const v = await createClerkVerifier(cfg({ clerkAuthorizedParties: ['http://localhost:5173'] }));
  assert.ok(await v(await sign({ azp: 'http://localhost:5173' })));
  await assert.rejects(async () => v(await sign({ azp: 'https://evil.example.com' })), /party/);
});

test('publishable key -> issuer derivation', () => {
  const pk = 'pk_test_' + Buffer.from('clerk.example.accounts.dev$').toString('base64');
  assert.equal(issuerFromPublishableKey(pk), 'https://clerk.example.accounts.dev');
  assert.equal(issuerFromPublishableKey('nonsense'), ''); assert.equal(issuerFromPublishableKey('pk_test_' + Buffer.from('bad host/../x$').toString('base64')), '');
});

test('demo verifier accepts only well-formed demo tokens', async () => {
  const v = createDemoVerifier();
  assert.equal((await v('demo.alice')).userId, 'demo_alice');
  for (const bad of ['alice', 'demo.', 'demo.a', 'demo.has space', 'demo.../etc', 'demo.' + 'x'.repeat(41)]) await assert.rejects(() => v(bad), undefined, bad);
});

test('config validation blocks unsafe or incomplete setups', () => {
  const base = { env: 'development', authMode: 'demo', aiEngine: 'mock' };
  assert.deepEqual(validateConfig(loadConfig(base)), []);
  assert.ok(validateConfig(loadConfig({ ...base, env: 'production', supabaseUrl: 'x', supabaseServiceKey: 'y' })).some((p) => /demo/i.test(p)));
  assert.ok(validateConfig(loadConfig({ ...base, authMode: 'clerk', clerkJwtKey: '', clerkIssuer: '', clerkPublishableKey: '' })).some((p) => /Clerk/.test(p)));
  assert.ok(validateConfig(loadConfig({ ...base, aiEngine: 'openai', openaiApiKey: '' })).some((p) => /OPENAI_API_KEY/.test(p)));
  assert.ok(validateConfig(loadConfig({ ...base, authMode: 'clerk', clerkIssuer: ISS, env: 'production' })).some((p) => /SUPABASE/.test(p)));
  assert.deepEqual(validateConfig(loadConfig({ env: 'production', authMode: 'clerk', clerkIssuer: ISS, aiEngine: 'openai', openaiApiKey: 'k', supabaseUrl: 'u', supabaseServiceKey: 's' })), []);
});

test('HTTP: Clerk mode protects the API and identifies users by token subject', async () => {
  const app = await startApp({ overrides: { authMode: 'clerk', clerkJwtKey: pem, clerkIssuer: ISS } });
  try {
    assert.equal((await app.call('GET', '/me')).status, 401);
    assert.equal((await app.call('GET', '/me', { token: 'demo.alice' })).status, 401, 'demo tokens must not work in clerk mode');
    assert.equal((await app.call('GET', '/me', { token: await sign({}, { key: other.privateKey }) })).status, 401);
    assert.equal((await app.call('GET', '/me', { token: await sign({}, { exp: Math.floor(Date.now() / 1000) - 120 }) })).status, 401);
    const me = await app.call('GET', '/me', { token: await sign({}, { sub: 'user_real_1' }) });
    assert.equal(me.status, 200); assert.equal(me.body.userId, 'user_real_1');
    assert.equal((await app.call('GET', '/health')).status, 200);                                                    // health stays public
  } finally { await app.stop(); }
});
