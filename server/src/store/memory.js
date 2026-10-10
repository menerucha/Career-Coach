import { randomUUID } from 'node:crypto';

/** In-memory store: dev/demo/tests. Same contract as SupabaseStore (see test/store.contract.js). */
export class MemoryStore {
  constructor() { this.name = 'memory'; this.reports = []; this.profiles = new Map(); this.usage = []; this.lastTs = 0; }
  #now() { this.lastTs = Math.max(Date.now(), this.lastTs + 1); return new Date(this.lastTs).toISOString(); }

  async createReport({ userId, type, title, input, output, engine, model }) {
    const r = { id: randomUUID(), userId, type, title, input, output, engine, model: model || null, createdAt: this.#now() };
    this.reports.push(r); return structuredClone(r);
  }
  async listReports(userId, { type, limit = 20, before } = {}) {
    let rows = this.reports.filter((r) => r.userId === userId && (!type || r.type === type) && (!before || r.createdAt < before));
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const page = rows.slice(0, limit), more = rows.length > limit;
    return { items: page.map(({ input, output, userId: _u, ...meta }) => meta), nextCursor: more ? page[page.length - 1].createdAt : null };
  }
  async getReport(userId, id) { const r = this.reports.find((x) => x.id === id && x.userId === userId); return r ? structuredClone(r) : null; }
  async deleteReport(userId, id) { const i = this.reports.findIndex((x) => x.id === id && x.userId === userId); if (i < 0) return false; this.reports.splice(i, 1); return true; }
  /** Append-only usage log used for quotas: deleting reports must NOT give the user their quota back. */
  async recordUsage(userId) { this.usage.push({ userId, at: this.#now() }); }
  async countUsageSince(userId, sinceIso) { return this.usage.filter((u) => u.userId === userId && u.at >= sinceIso).length; }
  async getProfile(userId) { return this.profiles.has(userId) ? structuredClone(this.profiles.get(userId)) : null; }
  async upsertProfile(userId, p) { const row = { ...p, updatedAt: this.#now() }; this.profiles.set(userId, row); return structuredClone(row); }
  async ping() { return true; }
}
