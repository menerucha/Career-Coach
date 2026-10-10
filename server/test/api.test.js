import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, inputs } from './helpers.js';
import { AIError } from '../src/errors.js';
import { MockEngine } from '../src/ai/mock.js';

const SLUGS = Object.keys(inputs), TYPE = { resume: 'resume', 'skill-gap': 'skill_gap', roadmap: 'roadmap', interview: 'interview', 'interview-feedback': 'answer_feedback' };
let app; const A = 'demo.alice', B = 'demo.bob';
before(async () => { app = await startApp(); });
after(async () => { await app.stop(); });

test('public endpoints work without a token; protected ones return 401', async () => {
  assert.equal((await app.call('GET', '/health')).body.status, 'ok');
  const sc = await app.call('GET', '/scenarios'); assert.ok(sc.body.scenarios.length >= 5 && sc.body.scenarios.every((s) => s.id && s.label && s.context));
  for (const [m, p] of [['GET', '/me'], ['PUT', '/profile'], ['GET', '/reports'], ['GET', '/reports/x'], ['DELETE', '/reports/x'], ...SLUGS.map((s) => ['POST', `/analyze/${s}`])]) assert.equal((await app.call(m, p)).status, 401, `${m} ${p}`);
});

test('every workflow generates, stores and returns a report (201) without leaking the user id', async () => {
  for (const slug of SLUGS) {
    const r = await app.call('POST', `/analyze/${slug}`, { token: A, body: inputs[slug] });
    assert.equal(r.status, 201, `${slug}: ${JSON.stringify(r.body)}`);
    const rep = r.body.report; assert.equal(rep.type, TYPE[slug]); assert.ok(rep.id && rep.title && rep.output && rep.createdAt); assert.equal(rep.engine, 'mock'); assert.ok(!('userId' in rep));
    const back = await app.call('GET', `/reports/${rep.id}`, { token: A }); assert.equal(back.status, 200); assert.deepEqual(back.body.report.output, rep.output);
  }
});

test('validation errors are 400 with per-field details', async () => {
  const r = await app.call('POST', '/analyze/resume', { token: A, body: { resumeText: 'too short' } });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'BAD_REQUEST'); assert.equal(r.body.error.details[0].field, 'resumeText');
  assert.equal((await app.call('POST', '/analyze/skill-gap', { token: A, body: { targetRole: 'Dev', currentSkills: [] } })).status, 400);
  assert.equal((await app.call('POST', '/analyze/roadmap', { token: A, body: { ...inputs.roadmap, timeframeMonths: 500 } })).status, 400);
  assert.equal((await app.call('POST', '/analyze/interview', { token: A, body: { role: 'Dev', interviewType: 'karaoke' } })).status, 400);
  assert.equal((await app.call('POST', '/analyze/nope', { token: A, body: {} })).status, 404);
  assert.equal((await app.call('POST', '/analyze/resume', { token: A, raw: '{broken' })).body.error.code, 'BAD_JSON');
  assert.equal((await app.call('POST', '/analyze/resume', { token: A, body: { resumeText: 'x'.repeat(200_000) } })).status, 413);
  assert.equal((await app.call('POST', '/analyze/resume', { token: A })).status, 400);
});

test('users are isolated: no cross-user read, list or delete', async () => {
  const a = (await app.call('POST', '/analyze/roadmap', { token: A, body: inputs.roadmap })).body.report;
  assert.equal((await app.call('GET', `/reports/${a.id}`, { token: B })).status, 404);
  assert.equal((await app.call('DELETE', `/reports/${a.id}`, { token: B })).status, 404);
  assert.ok(!(await app.call('GET', '/reports?limit=50', { token: B })).body.items.some((x) => x.id === a.id));
  assert.equal((await app.call('GET', `/reports/${a.id}`, { token: A })).status, 200, 'still there for the owner');
  assert.equal((await app.call('GET', '/reports/not-a-uuid', { token: A })).status, 404);
});

test('list: filter by type, pagination via cursor, validation', async () => {
  const u = 'demo.lister'; for (let i = 0; i < 5; i++) await app.call('POST', '/analyze/skill-gap', { token: u, body: inputs['skill-gap'] });
  await app.call('POST', '/analyze/roadmap', { token: u, body: inputs.roadmap });
  const p1 = await app.call('GET', '/reports?limit=4', { token: u }); assert.equal(p1.body.items.length, 4); assert.ok(p1.body.nextCursor);
  const p2 = await app.call('GET', `/reports?limit=4&cursor=${encodeURIComponent(p1.body.nextCursor)}`, { token: u }); assert.equal(p2.body.items.length, 2); assert.equal(p2.body.nextCursor, null);
  assert.equal((await app.call('GET', '/reports?type=roadmap', { token: u })).body.items.length, 1);
  assert.equal((await app.call('GET', '/reports?type=bogus', { token: u })).status, 400); assert.equal((await app.call('GET', '/reports?limit=0', { token: u })).status, 400);
  assert.equal((await app.call('GET', '/reports?cursor=yesterday', { token: u })).status, 400);
});

test('delete removes the report (204) and a second delete is 404', async () => {
  const r = (await app.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] })).body.report;
  assert.equal((await app.call('DELETE', `/reports/${r.id}`, { token: A })).status, 204);
  assert.equal((await app.call('GET', `/reports/${r.id}`, { token: A })).status, 404); assert.equal((await app.call('DELETE', `/reports/${r.id}`, { token: A })).status, 404);
});

test('profile: validated upsert, readable via /me', async () => {
  const u = 'demo.prof';
  assert.equal((await app.call('GET', '/me', { token: u })).body.profile, null);
  const r = await app.call('PUT', '/profile', { token: u, body: { targetRole: 'Data Analyst', experienceLevel: 'mid', skills: ['sql', 'sql', 'excel'] } });
  assert.equal(r.status, 200); assert.deepEqual(r.body.profile.skills, ['sql', 'excel']);
  assert.equal((await app.call('GET', '/me', { token: u })).body.profile.targetRole, 'Data Analyst');
  assert.equal((await app.call('PUT', '/profile', { token: u, body: { experienceLevel: 'wizard' } })).status, 400);
});

test('interview answer feedback can link to an owned interview report only', async () => {
  const iv = (await app.call('POST', '/analyze/interview', { token: A, body: inputs.interview })).body.report;
  const ok = await app.call('POST', '/analyze/interview-feedback', { token: A, body: { ...inputs['interview-feedback'], reportId: iv.id } });
  assert.equal(ok.status, 201); assert.equal(ok.body.report.input.reportId, iv.id);
  assert.equal((await app.call('POST', '/analyze/interview-feedback', { token: B, body: { ...inputs['interview-feedback'], reportId: iv.id } })).status, 404, "cannot attach to someone else's report");
  assert.equal((await app.call('POST', '/analyze/interview-feedback', { token: A, body: { ...inputs['interview-feedback'], reportId: 'nope' } })).status, 400);
});

test('daily quota: enforced per user, shown in /me, NOT refundable by deleting reports', async () => {
  const q = await startApp({ overrides: { dailyLimit: 3 } });
  try {
    const ids = [];
    for (let i = 0; i < 3; i++) { const r = await q.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] }); assert.equal(r.status, 201); assert.equal(r.body.quota.remaining, 2 - i); ids.push(r.body.report.id); }
    const blocked = await q.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] });
    assert.equal(blocked.status, 429); assert.equal(blocked.body.error.code, 'DAILY_LIMIT');
    assert.deepEqual((await q.call('GET', '/me', { token: A })).body.quota, { limit: 3, used: 3, remaining: 0 });
    for (const id of ids) await q.call('DELETE', `/reports/${id}`, { token: A });
    assert.equal((await q.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] })).status, 429, 'deleting reports must not reset the quota');
    assert.equal((await q.call('POST', '/analyze/skill-gap', { token: B, body: inputs['skill-gap'] })).status, 201, 'other users unaffected');
  } finally { await q.stop(); }
});

test('per-minute AI rate limit returns 429 RATE_LIMITED per user', async () => {
  const q = await startApp({ overrides: { ratePerMinute: 3 } });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await q.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] })).status, 201);
    const r = await q.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] }); assert.equal(r.status, 429); assert.equal(r.body.error.code, 'RATE_LIMITED');
    assert.equal((await q.call('POST', '/analyze/skill-gap', { token: B, body: inputs['skill-gap'] })).status, 201);
  } finally { await q.stop(); }
});

test('AI failure: clean error, nothing saved, quota not consumed, server keeps working', async () => {
  const failing = { name: 'openai', model: 'x', run: async () => { throw new AIError('The AI service is temporarily unavailable.', { status: 502, code: 'AI_UNAVAILABLE', cause: new Error('upstream secret detail') }); } };
  const q = await startApp({ engine: failing, overrides: { dailyLimit: 5 } });
  try {
    const r = await q.call('POST', '/analyze/resume', { token: A, body: inputs.resume });
    assert.equal(r.status, 502); assert.equal(r.body.error.code, 'AI_UNAVAILABLE'); assert.ok(!JSON.stringify(r.body).includes('secret'));
    assert.equal((await q.call('GET', '/reports', { token: A })).body.items.length, 0);
    assert.equal((await q.call('GET', '/me', { token: A })).body.quota.used, 0);
    const crash = await startApp({ engine: { name: 'x', run: async () => { throw new Error('boom internals'); } } });
    const c = await crash.call('POST', '/analyze/resume', { token: A, body: inputs.resume }); assert.equal(c.status, 500); assert.ok(!JSON.stringify(c.body).includes('boom')); await crash.stop();
  } finally { await q.stop(); }
});

test('unknown routes 404 as JSON; security headers present; CORS limited to the configured origin', async () => {
  assert.equal((await app.call('GET', '/nope')).status, 401, 'unauthenticated callers cannot probe which routes exist');
  const r = await app.call('GET', '/nope', { token: A }); assert.equal(r.status, 404); assert.equal(r.body.error.code, 'NOT_FOUND');
  assert.equal((await fetch(app.base.replace('/api', '') + '/other')).status, 404);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.equal(r.headers.get('x-powered-by'), null);
  const ok = await app.call('GET', '/health', { headers: { origin: 'http://localhost:5173' } }); assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const evil = await app.call('GET', '/health', { headers: { origin: 'https://evil.example.com' } }); assert.equal(evil.headers.get('access-control-allow-origin'), null);
});
