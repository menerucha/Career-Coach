import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** The behaviour every store implementation (memory, Supabase/Postgres) must provide. */
export function runStoreContract(label, makeStore) {
  const mk = (over = {}) => ({ type: 'skill_gap', title: 'T', input: { a: 1, nested: { x: [1, 2] } }, output: { b: 2, list: ['é', '日本'] }, engine: 'mock', model: null, ...over });
  const uid = () => `user_${randomUUID().slice(0, 8)}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  test(`[${label}] create / get round-trips JSON exactly and scopes by user`, async () => {
    const s = await makeStore(), a = uid(), b = uid();
    const r = await s.createReport({ userId: a, ...mk() });
    assert.match(r.id, /^[0-9a-f-]{36}$/); assert.ok(r.createdAt);
    const got = await s.getReport(a, r.id);
    assert.deepEqual(got.input, mk().input); assert.deepEqual(got.output, mk().output); assert.equal(got.engine, 'mock'); assert.equal(got.type, 'skill_gap');
    assert.equal(await s.getReport(b, r.id), null, 'other users must not see it');
    assert.equal(await s.getReport(a, randomUUID()), null);
  });

  test(`[${label}] list: newest first, type filter, light payload, cursor pagination without gaps or duplicates`, async () => {
    const s = await makeStore(), u = uid(), ids = [];
    for (let i = 0; i < 7; i++) { ids.push((await s.createReport({ userId: u, ...mk({ type: i % 2 ? 'resume' : 'roadmap', title: `R${i}` }) })).id); await sleep(8); }
    await s.createReport({ userId: uid(), ...mk() });
    const all = await s.listReports(u, { limit: 50 });
    assert.deepEqual(all.items.map((x) => x.id), [...ids].reverse()); assert.equal(all.nextCursor, null);
    assert.ok(!('output' in all.items[0]) && !('input' in all.items[0]) && !('userId' in all.items[0]));
    assert.equal((await s.listReports(u, { type: 'resume' })).items.length, 3);
    const seen = []; let cursor;
    for (let guard = 0; guard < 10; guard++) { const p = await s.listReports(u, { limit: 3, before: cursor }); seen.push(...p.items.map((x) => x.id)); if (!p.nextCursor) break; cursor = p.nextCursor; }
    assert.deepEqual(seen, [...ids].reverse());
  });

  test(`[${label}] delete only removes the owner's report`, async () => {
    const s = await makeStore(), a = uid(), b = uid(), r = await s.createReport({ userId: a, ...mk() });
    assert.equal(await s.deleteReport(b, r.id), false); assert.ok(await s.getReport(a, r.id));
    assert.equal(await s.deleteReport(a, r.id), true); assert.equal(await s.getReport(a, r.id), null); assert.equal(await s.deleteReport(a, r.id), false);
  });

  test(`[${label}] usage log counts per user and is NOT reduced by deleting reports`, async () => {
    const s = await makeStore(), a = uid(), b = uid(), since = new Date(Date.now() - 60_000).toISOString();
    const r = await s.createReport({ userId: a, ...mk() });
    await s.recordUsage(a); await s.recordUsage(a); await s.recordUsage(b);
    assert.equal(await s.countUsageSince(a, since), 2); assert.equal(await s.countUsageSince(b, since), 1);
    await s.deleteReport(a, r.id); assert.equal(await s.countUsageSince(a, since), 2, 'deleting must not refund quota');
    assert.equal(await s.countUsageSince(a, new Date(Date.now() + 60_000).toISOString()), 0, 'window respected');
  });

  test(`[${label}] profile upsert / read`, async () => {
    const s = await makeStore(), u = uid();
    assert.equal(await s.getProfile(u), null);
    await s.upsertProfile(u, { targetRole: 'Data Analyst', experienceLevel: 'mid', skills: ['sql', 'excel'] });
    await s.upsertProfile(u, { targetRole: 'Data Scientist', experienceLevel: 'senior', skills: ['python'] });
    const p = await s.getProfile(u); assert.equal(p.targetRole, 'Data Scientist'); assert.equal(p.experienceLevel, 'senior'); assert.deepEqual(p.skills, ['python']);
    assert.equal(await s.getProfile(uid()), null); assert.equal(await s.ping(), true);
  });
}
