import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from '@/lib/api.js';

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } });
const setup = (impl) => { const f = vi.fn(impl); vi.stubGlobal('fetch', f); return { f, api: createApi(async () => 'tok123', '/api') }; };

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    const { f, api } = setup(async () => res(201, { report: { id: 'x' } }));
    await api.analyze('resume', { resumeText: 'abc' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/analyze/resume'); expect(init.method).toBe('POST'); expect(init.headers.Authorization).toBe('Bearer tok123'); expect(init.headers['Content-Type']).toBe('application/json'); expect(JSON.parse(init.body)).toEqual({ resumeText: 'abc' });
  });
  it('omits Authorization when there is no token and Content-Type for GET', async () => {
    const f = vi.fn(async () => res(200, {})); vi.stubGlobal('fetch', f);
    await createApi(async () => null, '/api').me(); expect(f.mock.calls[0][1].headers.Authorization).toBeUndefined(); expect(f.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
  it('maps error responses to ApiError with field details', async () => {
    const { api } = setup(async () => res(400, { error: { code: 'BAD_REQUEST', message: 'Resume text must be at least 200 characters', details: [{ field: 'resumeText', message: 'too short' }] } }));
    const e = await api.analyze('resume', {}).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError); expect(e.status).toBe(400); expect(e.code).toBe('BAD_REQUEST'); expect(e.fields).toEqual({ resumeText: 'too short' });
  });
  it('handles 204, non-JSON errors and network failures', async () => {
    expect(await setup(async () => res(204)).api.deleteReport('abc')).toBeNull();
    const e = await setup(async () => res(502)).api.me().catch((x) => x); expect(e.status).toBe(502); expect(e.message).toMatch(/502/);
    const n = await setup(async () => { throw new TypeError('failed'); }).api.me().catch((x) => x); expect(n.code).toBe('NETWORK'); expect(n.status).toBe(0);
  });
  it('builds list queries with encoded cursors and filters', async () => {
    const { f, api } = setup(async () => res(200, { items: [] }));
    await api.listReports({ type: 'resume', cursor: '2026-10-01T10:00:00.123456+00:00', limit: 5 });
    expect(f.mock.calls[0][0]).toBe('/api/reports?limit=5&type=resume&cursor=2026-10-01T10%3A00%3A00.123456%2B00%3A00');
    await api.getReport('a/b'); expect(f.mock.calls[1][0]).toBe('/api/reports/a%2Fb');
  });
});
