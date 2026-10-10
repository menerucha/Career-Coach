import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '@/App.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import HistoryPage from '@/pages/HistoryPage.jsx';
import ProfilePage from '@/pages/ProfilePage.jsx';
import ReportPage from '@/pages/ReportPage.jsx';
import { DemoAuth } from '@/lib/auth.jsx';
import { ApiProvider } from '@/lib/ApiContext.jsx';
import { MeProvider } from '@/lib/MeContext.jsx';
import { ApiError } from '@/lib/api.js';
import { fakeApi, fixtures as fx, ME, report, renderApp, signedIn } from './helpers.jsx';

const item = (i, over = {}) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, type: 'resume', title: `Report ${i}`, engine: 'openai', model: 'm', createdAt: `2026-10-0${i}T10:00:00.000Z`, ...over });

describe('History', () => {
  it('lists reports, filters by type via tabs, and paginates with the cursor', async () => {
    const api = fakeApi({ listReports: vi.fn(async ({ type, cursor }) => (cursor ? { items: [item(3, { title: 'Report 3' })], nextCursor: null } : { items: type === 'roadmap' ? [item(9, { type: 'roadmap', title: 'Roadmap one' })] : [item(1), item(2)], nextCursor: type ? null : '2026-10-01T10:00:00.000Z' })) });
    renderApp(<HistoryPage />, { api });
    expect(await screen.findByText('Report 1')).toBeInTheDocument(); expect(screen.getByText('Report 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' })); expect(await screen.findByText('Report 3')).toBeInTheDocument(); expect(api.listReports).toHaveBeenLastCalledWith({ type: '', cursor: '2026-10-01T10:00:00.000Z' }); expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Roadmap' })); expect(await screen.findByText('Roadmap one')).toBeInTheDocument(); expect(screen.queryByText('Report 1')).not.toBeInTheDocument(); expect(api.listReports).toHaveBeenLastCalledWith({ type: 'roadmap' });
  });
  it('deletes after confirmation; cancel keeps the report', async () => {
    const api = fakeApi({ listReports: vi.fn(async () => ({ items: [item(1), item(2)], nextCursor: null })) });
    renderApp(<HistoryPage />, { api }); await screen.findByText('Report 1');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Report 1' })); await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(api.deleteReport).not.toHaveBeenCalled(); expect(screen.getByText('Report 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Report 1' })); await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Report 1')).not.toBeInTheDocument()); expect(api.deleteReport).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001'); expect(screen.getByText('Report 2')).toBeInTheDocument();
  });
  it('keeps the report and shows an error toast when delete fails', async () => {
    const api = fakeApi({ listReports: vi.fn(async () => ({ items: [item(1)], nextCursor: null })), deleteReport: vi.fn(async () => { throw new ApiError(500, 'INTERNAL_ERROR', 'Internal server error'); }) });
    renderApp(<HistoryPage />, { api }); await screen.findByText('Report 1');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Report 1' })); await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteReport).toHaveBeenCalled()); expect(screen.getByText('Report 1')).toBeInTheDocument();
  });
  it('shows an empty state and an error state', async () => {
    const { unmount } = renderApp(<HistoryPage />); expect(await screen.findByText('Nothing here yet')).toBeInTheDocument(); unmount();
    renderApp(<HistoryPage />, { api: fakeApi({ listReports: vi.fn(async () => { throw new ApiError(0, 'NETWORK', 'Cannot reach the server.'); }) }) });
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
  });
  it('flags demo-engine reports', async () => { renderApp(<HistoryPage />, { api: fakeApi({ listReports: vi.fn(async () => ({ items: [item(1, { engine: 'mock' })], nextCursor: null })) }) }); expect(await screen.findByText('demo engine')).toBeInTheDocument(); });
});

describe('Report page', () => {
  const at = (api) => renderApp(<Routes><Route path="/reports/:id" element={<ReportPage />} /><Route path="/history" element={<div>HISTORY PAGE</div>} /></Routes>, { api, route: '/reports/11111111-1111-4111-8111-111111111111' });
  it.each([['resume', /Resume score/], ['skill_gap', /skills match/], ['roadmap', /-week roadmap/], ['interview', /questions/], ['answer_feedback', /Improved answer/]])('renders a saved %s report', async (type, matcher) => {
    at(fakeApi({ getReport: vi.fn(async () => ({ report: report(type) })) }));
    expect(await screen.findByRole('heading', { level: 1, name: `Title ${type}` })).toBeInTheDocument(); expect(screen.getAllByText(matcher).length).toBeGreaterThan(0);
  });
  it('shows not-found for missing reports without a retry button', async () => {
    at(fakeApi({ getReport: vi.fn(async () => { throw new ApiError(404, 'NOT_FOUND', 'Report not found'); }) }));
    expect(await screen.findByText('Report not found')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
  it('deletes the report and returns to history', async () => {
    const api = fakeApi({ getReport: vi.fn(async () => ({ report: report('resume') })) }); at(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' })); await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('HISTORY PAGE')).toBeInTheDocument(); expect(api.deleteReport).toHaveBeenCalled();
  });
  it('an interview report offers practice only when it has an id (saved)', async () => {
    at(fakeApi({ getReport: vi.fn(async () => ({ report: report('interview') })) }));
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(fx.interview.questions[0].question.slice(0, 25)) })); expect(await screen.findByRole('button', { name: 'Get feedback' })).toBeInTheDocument();
  });
});

describe('Dashboard & Profile', () => {
  it('shows the four workflows, recent reports and a profile tip', async () => {
    const api = fakeApi({ listReports: vi.fn(async () => ({ items: [item(1), item(2)], nextCursor: null })) });
    renderApp(<Dashboard />, { api });
    for (const t of ['Resume feedback', 'Skill-gap analysis', 'Career roadmap', 'Interview prep']) expect(screen.getByRole('link', { name: new RegExp(t) })).toBeInTheDocument();
    expect(await screen.findByText('Report 2')).toBeInTheDocument(); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome, Alex'); expect(await screen.findByText(/save your profile/)).toBeInTheDocument();
  });
  it('saves the profile with validation-friendly payload', async () => {
    const { api } = renderApp(<ProfilePage />);
    await userEvent.type(screen.getByLabelText('Target role'), 'Data Analyst'); await userEvent.selectOptions(screen.getByLabelText('Experience level'), 'senior'); await userEvent.type(screen.getByLabelText('Skills'), 'sql,python,');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({ targetRole: 'Data Analyst', experienceLevel: 'senior', skills: ['sql', 'python'] }));
  });
});

describe('App shell, routing & layout', () => {
  const app = (api, route) => render(<MemoryRouter initialEntries={[route]}><DemoAuth><App /></DemoAuth></MemoryRouter>);
  it('signed-out users see the landing page and are redirected from protected pages', async () => {
    const { unmount } = app(null, '/'); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI career coach/i); unmount();
    app(null, '/resume'); expect(await screen.findByText('Try the demo')).toBeInTheDocument();
  });
  it('signed-in users get the layout with navigation, quota and the demo-engine banner', async () => {
    signedIn(); const api = fakeApi({ me: vi.fn(async () => ({ ...ME, engine: 'mock', quota: { limit: 25, used: 24, remaining: 1 } })) });
    vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, status: 200, json: async () => (String(url).endsWith('/me') ? { ...ME, engine: 'mock', quota: { limit: 25, used: 24, remaining: 1 } } : String(url).includes('/scenarios') ? { scenarios: [] } : { items: [], nextCursor: null }) })));
    app(api, '/dashboard');
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument(); for (const n of ['Dashboard', 'Resume', 'Skills', 'Roadmap', 'Interview', 'History']) expect(screen.getByRole('link', { name: n })).toBeInTheDocument();
    expect(await screen.findByText('1/25 analyses left today')).toBeInTheDocument(); expect(screen.getByText(/offline demo engine/i)).toBeInTheDocument(); expect(screen.getByText(/Demo sign-in is active/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Resume' })); expect(await screen.findByRole('heading', { level: 1, name: 'Resume feedback' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' })); expect(await screen.findByText('Try the demo')).toBeInTheDocument();
  });
});
