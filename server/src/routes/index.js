import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError, notFound } from '../errors.js';
import { parse } from '../middleware/common.js';
import { REPORT_TYPES, WORKFLOWS, profileInput } from '../schemas.js';
import { SCENARIOS } from '../scenarios.js';

const DAY_MS = 24 * 3600 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// URL slug -> workflow kind
const ROUTES = { resume: 'resume', 'skill-gap': 'skill_gap', roadmap: 'roadmap', interview: 'interview', 'interview-feedback': 'answer_feedback' };
const TITLES = {
  resume: (i) => `Resume feedback${i.targetRole ? ` · ${i.targetRole}` : ''}`,
  skill_gap: (i) => `Skill gap · ${i.targetRole}`,
  roadmap: (i) => `Roadmap · ${i.targetRole} (${i.timeframeMonths} mo)`,
  interview: (i) => `Interview prep · ${i.role} (${i.interviewType})`,
  answer_feedback: (i) => `Answer feedback · ${i.question.slice(0, 60)}${i.question.length > 60 ? '…' : ''}`,
};

export function buildRouter({ cfg, store, engine, requireAuth }) {
  const r = Router();
  const userKey = (req) => req.userId || 'anon';
  const apiLimiter = rateLimit({ windowMs: 60_000, limit: cfg.apiPerMinute, keyGenerator: userKey, standardHeaders: 'draft-7', legacyHeaders: false, validate: { keyGeneratorIpFallback: false },
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down a little.' } }) });
  const aiLimiter = rateLimit({ windowMs: 60_000, limit: cfg.ratePerMinute, keyGenerator: userKey, standardHeaders: 'draft-7', legacyHeaders: false, validate: { keyGeneratorIpFallback: false },
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: `You can run up to ${cfg.ratePerMinute} analyses per minute. Please wait a moment.` } }) });

  // ---------------------------------------------------------------- public
  r.get('/health', async (req, res) => {
    const storeOk = await store.ping().catch(() => false);
    res.status(storeOk ? 200 : 503).json({ status: storeOk ? 'ok' : 'degraded', store: store.name, engine: engine.name, auth: cfg.authMode });
  });
  r.get('/scenarios', (req, res) => res.json({ scenarios: SCENARIOS }));

  // ---------------------------------------------------------------- authenticated
  r.use(requireAuth, apiLimiter);

  async function quota(userId) {
    const used = await store.countUsageSince(userId, new Date(Date.now() - DAY_MS).toISOString());
    return { limit: cfg.dailyLimit, used, remaining: Math.max(0, cfg.dailyLimit - used) };
  }

  r.get('/me', async (req, res) => {
    const [profile, q] = await Promise.all([store.getProfile(req.userId), quota(req.userId)]);
    res.json({ userId: req.userId, profile, quota: q, engine: engine.name, model: engine.model || null, store: store.name });
  });

  r.put('/profile', async (req, res) => {
    const p = parse(profileInput, req.body);
    p.skills = [...new Set(p.skills)];
    res.json({ profile: await store.upsertProfile(req.userId, p) });
  });

  r.post('/analyze/:slug', aiLimiter, async (req, res) => {
    const kind = ROUTES[req.params.slug];
    if (!kind) throw notFound('Unknown analysis type');
    const wf = WORKFLOWS[kind];
    const input = parse(wf.input, req.body);

    if (kind === 'answer_feedback' && input.reportId && !(await store.getReport(req.userId, input.reportId))) throw notFound('Interview report not found');
    const q = await quota(req.userId);
    if (q.remaining <= 0) throw new AppError(429, 'DAILY_LIMIT', `Daily limit of ${q.limit} analyses reached. Try again tomorrow.`);

    const output = await engine.run(kind, input);                 // throws AIError on failure -> nothing saved, quota untouched
    await store.recordUsage(req.userId);                          // counted once the AI answered, independent of later report deletion
    const report = await store.createReport({ userId: req.userId, type: wf.type, title: TITLES[kind](input), input, output, engine: engine.name, model: engine.model || null });
    const { userId: _u, ...safe } = report;
    res.status(201).json({ report: safe, quota: { ...q, used: q.used + 1, remaining: q.remaining - 1 } });
  });

  const listQuery = z.object({
    type: z.enum(REPORT_TYPES).optional(), limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().datetime({ offset: true }).optional(),
  });
  r.get('/reports', async (req, res) => {
    const q = parse(listQuery, req.query);
    res.json(await store.listReports(req.userId, { type: q.type, limit: q.limit, before: q.cursor }));
  });
  r.get('/reports/:id', async (req, res) => {
    const rep = UUID.test(req.params.id) ? await store.getReport(req.userId, req.params.id) : null;
    if (!rep) throw notFound('Report not found');
    const { userId: _u, ...safe } = rep;
    res.json({ report: safe });
  });
  r.delete('/reports/:id', async (req, res) => {
    const ok = UUID.test(req.params.id) && (await store.deleteReport(req.userId, req.params.id));
    if (!ok) throw notFound('Report not found');
    res.status(204).end();
  });

  return r;
}
