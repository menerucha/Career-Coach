// Runs the store contract + RLS checks against a real Supabase-style stack (Postgres + PostgREST).
// Skipped unless SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY (and SUPABASE_TEST_ANON_KEY for the RLS test) are set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStore } from '../src/store/supabase.js';
import { runStoreContract } from './store.contract.js';
import { startApp, inputs } from './helpers.js';

const url = process.env.SUPABASE_TEST_URL, service = process.env.SUPABASE_TEST_SERVICE_KEY, anon = process.env.SUPABASE_TEST_ANON_KEY;

if (!url || !service) {
  test('supabase integration (skipped: set SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_KEY / SUPABASE_TEST_ANON_KEY)', { skip: true }, () => {});
} else {
  runStoreContract('supabase', async () => new SupabaseStore({ url, serviceKey: service }));

  test('RLS: the public anon key can neither read nor write any table', { skip: !anon }, async () => {
    const svc = new SupabaseStore({ url, serviceKey: service });
    await svc.createReport({ userId: 'user_rls_victim', type: 'resume', title: 'secret', input: { a: 1 }, output: { b: 2 }, engine: 'mock' });
    await svc.recordUsage('user_rls_victim'); await svc.upsertProfile('user_rls_victim', { targetRole: 'x', experienceLevel: 'mid', skills: [] });
    const c = createClient(url, anon, { auth: { persistSession: false } });
    for (const t of ['reports', 'usage_events', 'profiles']) {
      const read = await c.from(t).select('*'); assert.deepEqual(read.data, [], `${t}: anon must see zero rows`);
    }
    assert.ok((await c.from('reports').insert({ user_id: 'user_x', type: 'resume', title: 't', input: {}, output: {}, engine: 'mock' })).error, 'anon insert must be rejected by RLS');
    assert.ok((await c.from('profiles').upsert({ user_id: 'user_rls_victim', target_role: 'hacked' })).error, 'anon upsert must be rejected');
    const del = await c.from('reports').delete().eq('user_id', 'user_rls_victim').select(); assert.deepEqual(del.data ?? [], [], 'anon delete must affect nothing');
    assert.ok((await svc.listReports('user_rls_victim')).items.length >= 1, 'victim data intact');
  });

  test('schema constraints reject bad data', async () => {
    const db = createClient(url, service, { auth: { persistSession: false } });
    assert.ok((await db.from('reports').insert({ user_id: 'u', type: 'bogus', title: 't', input: {}, output: {}, engine: 'mock' })).error, 'type check');
    assert.ok((await db.from('reports').insert({ user_id: 'u', type: 'resume', title: 't', input: {}, output: {}, engine: 'gpt' })).error, 'engine check');
    assert.ok((await db.from('profiles').insert({ user_id: 'u2', experience_level: 'wizard' })).error, 'level check');
  });

  test('full API on the Supabase store: workflows, isolation, quota, deletion', async () => {
    const app = await startApp({ store: new SupabaseStore({ url, serviceKey: service }), overrides: { dailyLimit: 4 } });
    const A = `demo.sb${Date.now().toString(36)}`, B = `demo.sc${Date.now().toString(36)}`;
    try {
      const made = [];
      for (const slug of ['resume', 'skill-gap', 'roadmap', 'interview']) { const r = await app.call('POST', `/analyze/${slug}`, { token: A, body: inputs[slug] }); assert.equal(r.status, 201, `${slug} ${JSON.stringify(r.body)}`); made.push(r.body.report); }
      assert.equal((await app.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] })).body.error.code, 'DAILY_LIMIT');
      const got = await app.call('GET', `/reports/${made[0].id}`, { token: A }); assert.deepEqual(got.body.report.output, made[0].output);
      assert.equal((await app.call('GET', `/reports/${made[0].id}`, { token: B })).status, 404);
      assert.equal((await app.call('DELETE', `/reports/${made[0].id}`, { token: B })).status, 404);
      assert.equal((await app.call('GET', '/reports', { token: A })).body.items.length, 4);
      assert.equal((await app.call('DELETE', `/reports/${made[0].id}`, { token: A })).status, 204);
      assert.equal((await app.call('POST', '/analyze/skill-gap', { token: A, body: inputs['skill-gap'] })).status, 429, 'quota survives deletion');
      assert.equal((await app.call('GET', '/health')).body.store, 'supabase');
    } finally { await app.stop(); }
  });
}
