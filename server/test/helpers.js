import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';
import { MockEngine } from '../src/ai/mock.js';

const silent = { warn() {}, error() {}, log() {}, debug() {} };

export async function startApp({ overrides = {}, store = new MemoryStore(), engine = new MockEngine() } = {}) {
  const cfg = loadConfig({ authMode: 'demo', aiEngine: 'mock', dailyLimit: 25, ratePerMinute: 1000, apiPerMinute: 10000, env: 'test', ...overrides });
  const app = await createApp({ cfg, store, engine, logger: silent });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, { token, body, headers = {}, raw } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(body !== undefined || raw ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* empty */ }
    return { status: res.status, body: json, headers: res.headers };
  };
  return { cfg, store, engine, base, call, stop: () => new Promise((r) => server.close(r)) };
}

export const RESUME = `Jane Doe
jane@example.com | +1 555 010 0100 | linkedin.com/in/janedoe

Summary
Frontend developer with 4 years of experience building web apps.

Experience
- Built a React design system used by 12 teams, cutting UI bugs by 30%
- Led migration of 40 pages to TypeScript, improving build times by 25%
- Responsible for writing tests and various other things
- Worked on accessibility fixes across the checkout flow

Education
BSc Computer Science, State University

Skills
JavaScript, TypeScript, React, HTML, CSS, Git, Jest ${'and more words to pad the length '.repeat(12)}`;

export const inputs = {
  resume: { resumeText: RESUME, targetRole: 'Frontend Developer' },
  'skill-gap': { targetRole: 'Data Analyst', currentSkills: ['Excel', 'SQL', 'communication'], experienceLevel: 'mid' },
  roadmap: { currentBackground: 'I am a teacher who knows Excel and has strong communication skills.', targetRole: 'Data Analyst', timeframeMonths: 6, hoursPerWeek: 10, learningStyle: 'mixed' },
  interview: { role: 'Backend Developer', level: 'mid', interviewType: 'mixed', numQuestions: 5 },
  'interview-feedback': { question: 'Tell me about a time you resolved a conflict.', answer: 'When our team was behind on a launch, I decided to reorganise the backlog. My goal was to ship on time. I built a plan, cut scope by 30%, and as a result we delivered on schedule and I learned to negotiate priorities.' },
};
