import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { DemoAuth } from '@/lib/auth.jsx';
import { ApiProvider } from '@/lib/ApiContext.jsx';
import { MeProvider } from '@/lib/MeContext.jsx';
import fx from './fixtures.json';

export const fixtures = fx;
export const ME = { userId: 'demo_alex', profile: null, quota: { limit: 25, used: 1, remaining: 24 }, engine: 'openai', model: 'gpt-4o-mini', store: 'memory' };
export const SCENARIOS = { scenarios: [
  { id: 'new-grad', label: 'Student / new graduate', description: 'Little or no professional experience.', context: 'x', defaults: { experienceLevel: 'entry', level: 'junior', timeframeMonths: 6, hoursPerWeek: 12 } },
  { id: 'career-changer', label: 'Career changer', description: 'Moving into a new field.', context: 'y', defaults: { experienceLevel: 'entry', level: 'junior', timeframeMonths: 9, hoursPerWeek: 10 } },
] };

export const report = (type, over = {}) => ({ id: '11111111-1111-4111-8111-111111111111', type, title: `Title ${type}`, engine: 'openai', model: 'gpt-4o-mini', createdAt: '2026-10-01T10:00:00.000Z', input: {}, output: fx[type], ...over });
export const created = (type, over = {}) => ({ report: report(type, over), quota: { limit: 25, used: 2, remaining: 23 } });

/** A fake API with sensible defaults; override any method per test. */
export function fakeApi(over = {}) {
  return {
    me: vi.fn(async () => ME), scenarios: vi.fn(async () => SCENARIOS), updateProfile: vi.fn(async (p) => ({ profile: p })),
    analyze: vi.fn(async (slug) => created({ resume: 'resume', 'skill-gap': 'skill_gap', roadmap: 'roadmap', interview: 'interview', 'interview-feedback': 'answer_feedback' }[slug])),
    listReports: vi.fn(async () => ({ items: [], nextCursor: null })), getReport: vi.fn(async () => ({ report: report('resume') })), deleteReport: vi.fn(async () => null), ...over,
  };
}

export function signedIn(name = 'Alex') { localStorage.setItem('cc.demoUser', JSON.stringify({ id: 'demo_alex', name, slug: 'alex' })); }

export function renderApp(ui, { api = fakeApi(), route = '/', user = true } = {}) {
  if (user) signedIn();
  const utils = render(<MemoryRouter initialEntries={[route]}><DemoAuth><ApiProvider api={api}><MeProvider>{ui}</MeProvider></ApiProvider></DemoAuth></MemoryRouter>);
  return { api, ...utils };
}
