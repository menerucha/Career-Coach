import { createClient } from '@supabase/supabase-js';

const fail = (op, error) => { const e = new Error(`Supabase ${op} failed: ${error.message || error.code}`); e.cause = error; throw e; };
const toReport = (r) => ({ id: r.id, userId: r.user_id, type: r.type, title: r.title, input: r.input, output: r.output, engine: r.engine, model: r.model, createdAt: r.created_at });

/**
 * Supabase (Postgres) store. The server uses the SERVICE ROLE key and ALWAYS filters by user_id; the browser never talks to
 * Supabase directly and RLS is enabled with no policies, so the anon key can read nothing (see supabase/migrations).
 */
export class SupabaseStore {
  constructor({ url, serviceKey, client }) {
    this.name = 'supabase';
    this.db = client || createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async createReport({ userId, type, title, input, output, engine, model }) {
    const { data, error } = await this.db.from('reports').insert({ user_id: userId, type, title, input, output, engine, model: model || null }).select().single();
    if (error) fail('insert report', error);
    return toReport(data);
  }

  async listReports(userId, { type, limit = 20, before } = {}) {
    let q = this.db.from('reports').select('id,type,title,engine,model,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit + 1);
    if (type) q = q.eq('type', type);
    if (before) q = q.lt('created_at', before);
    const { data, error } = await q;
    if (error) fail('list reports', error);
    const page = data.slice(0, limit);
    return { items: page.map((r) => ({ id: r.id, type: r.type, title: r.title, engine: r.engine, model: r.model, createdAt: r.created_at })), nextCursor: data.length > limit ? page[page.length - 1].created_at : null };
  }

  async getReport(userId, id) {
    const { data, error } = await this.db.from('reports').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error) fail('get report', error);
    return data ? toReport(data) : null;
  }

  async deleteReport(userId, id) {
    const { data, error } = await this.db.from('reports').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) fail('delete report', error);
    return data.length > 0;
  }

  /** Append-only usage log used for quotas: deleting reports must NOT give the user their quota back. */
  async recordUsage(userId) {
    const { error } = await this.db.from('usage_events').insert({ user_id: userId });
    if (error) fail('record usage', error);
  }

  async countUsageSince(userId, sinceIso) {
    const { count, error } = await this.db.from('usage_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceIso);
    if (error) fail('count usage', error);
    return count || 0;
  }

  async getProfile(userId) {
    const { data, error } = await this.db.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) fail('get profile', error);
    return data ? { targetRole: data.target_role, experienceLevel: data.experience_level, skills: data.skills, updatedAt: data.updated_at } : null;
  }

  async upsertProfile(userId, p) {
    const { data, error } = await this.db.from('profiles').upsert({ user_id: userId, target_role: p.targetRole, experience_level: p.experienceLevel, skills: p.skills, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single();
    if (error) fail('upsert profile', error);
    return { targetRole: data.target_role, experienceLevel: data.experience_level, skills: data.skills, updatedAt: data.updated_at };
  }

  async ping() { const { error } = await this.db.from('profiles').select('user_id', { head: true, count: 'exact' }).limit(1); return !error; }
}
