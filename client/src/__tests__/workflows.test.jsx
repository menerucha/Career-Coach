import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumePage from '@/pages/ResumePage.jsx';
import SkillGapPage from '@/pages/SkillGapPage.jsx';
import RoadmapPage from '@/pages/RoadmapPage.jsx';
import InterviewPage from '@/pages/InterviewPage.jsx';
import { ApiError } from '@/lib/api.js';
import { created, fakeApi, fixtures as fx, ME, renderApp } from './helpers.jsx';

const longResume = 'Jane Doe resume text with plenty of detail about work. '.repeat(8);

describe('Resume feedback', () => {
  it('validates length on the client without calling the API', async () => {
    const { api } = renderApp(<ResumePage />);
    await userEvent.type(screen.getByLabelText('Resume text'), 'too short'); await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    expect(await screen.findByText(/at least 200 characters \(you have 9\)/)).toBeInTheDocument(); expect(screen.getByLabelText('Resume text')).toHaveAttribute('aria-invalid', 'true'); expect(api.analyze).not.toHaveBeenCalled();
  });

  it('submits trimmed input with scenario/role, shows score, breakdown, improvements, and a saved link', async () => {
    const { api } = renderApp(<ResumePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Career changer' }));
    await userEvent.type(screen.getByLabelText(/Target role/), 'Frontend Developer');
    await userEvent.click(screen.getByLabelText('Resume text')); await userEvent.paste(`   ${longResume}   `);
    await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    expect(await screen.findByRole('img', { name: `Overall: ${fx.resume.overallScore} out of 100` })).toBeInTheDocument();
    expect(api.analyze).toHaveBeenCalledWith('resume', { resumeText: longResume.trim(), targetRole: 'Frontend Developer', scenario: 'career-changer' });
    for (const s of fx.resume.sectionScores) expect(screen.getByRole('progressbar', { name: `${s.name} score` })).toHaveAttribute('aria-valuenow', String(s.score));
    expect(screen.getByText(fx.resume.improvements[0].issue)).toBeInTheDocument();
    expect(screen.getByText(fx.resume.improvements[0].suggestion)).toBeInTheDocument();                       // first improvement is expanded by default
    expect(screen.getByRole('link', { name: 'Open report' })).toHaveAttribute('href', '/reports/11111111-1111-4111-8111-111111111111');
    expect(screen.getByText('AI · gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows server-side field errors next to the field', async () => {
    const api = fakeApi({ analyze: vi.fn(async () => { throw new ApiError(400, 'BAD_REQUEST', 'Target role must be at most 100 characters', [{ field: 'targetRole', message: 'Target role must be at most 100 characters' }]); }) });
    renderApp(<ResumePage />, { api });
    await userEvent.click(screen.getByLabelText('Resume text')); await userEvent.paste(longResume); await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    const msgs = await screen.findAllByText('Target role must be at most 100 characters'); expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it('explains the daily limit; offers retry for transient AI errors and recovers', async () => {
    let n = 0;
    const api = fakeApi({ analyze: vi.fn(async () => { n++; if (n === 1) throw new ApiError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable.'); return created('resume'); }) });
    renderApp(<ResumePage />, { api });
    await userEvent.click(screen.getByLabelText('Resume text')); await userEvent.paste(longResume); await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    expect(await screen.findByText('The AI service is temporarily unavailable.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByRole('img', { name: /Overall/ })).toBeInTheDocument(); expect(api.analyze).toHaveBeenCalledTimes(2);
  });

  it('daily limit message is shown without a retry button', async () => {
    const api = fakeApi({ analyze: vi.fn(async () => { throw new ApiError(429, 'DAILY_LIMIT', 'Daily limit of 25 analyses reached. Try again tomorrow.'); }) });
    renderApp(<ResumePage />, { api });
    await userEvent.click(screen.getByLabelText('Resume text')); await userEvent.paste(longResume); await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    expect(await screen.findByText(/Daily limit of 25/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('loads a .txt file into the textarea', async () => {
    renderApp(<ResumePage />); const file = new File([longResume], 'resume.txt', { type: 'text/plain' });
    await userEvent.upload(screen.getByLabelText('Upload resume text file'), file);
    await waitFor(() => expect(screen.getByLabelText('Resume text')).toHaveValue(longResume));
  });

  it('disables the button while analysing and shows a progress skeleton', async () => {
    let release; const api = fakeApi({ analyze: vi.fn(() => new Promise((r) => { release = () => r(created('resume')); })) });
    renderApp(<ResumePage />, { api });
    await userEvent.click(screen.getByLabelText('Resume text')); await userEvent.paste(longResume); await userEvent.click(screen.getByRole('button', { name: 'Analyse resume' }));
    expect(screen.getByRole('button', { name: 'Analysing…' })).toBeDisabled(); expect(screen.getByRole('status', { name: 'Analysing' })).toBeInTheDocument();
    release(); expect(await screen.findByRole('img', { name: /Overall/ })).toBeInTheDocument(); expect(screen.queryByRole('status', { name: 'Analysing' })).not.toBeInTheDocument();
  });
});

describe('Skill-gap analysis', () => {
  it('requires a role and at least one skill', async () => {
    const { api } = renderApp(<SkillGapPage />); await userEvent.click(screen.getByRole('button', { name: 'Analyse skill gap' }));
    expect(await screen.findByText(/at least 2 characters/)).toBeInTheDocument(); expect(screen.getByText('Add at least one skill')).toBeInTheDocument(); expect(api.analyze).not.toHaveBeenCalled();
  });
  it('sends tags + level and renders match, gaps with importance and hours', async () => {
    const { api } = renderApp(<SkillGapPage />);
    await userEvent.type(screen.getByLabelText('Target role'), 'Data Analyst'); await userEvent.type(screen.getByLabelText('Your current skills'), 'Excel{Enter}SQL,');
    await userEvent.selectOptions(screen.getByLabelText('Experience level'), 'senior'); await userEvent.click(screen.getByRole('button', { name: 'Analyse skill gap' }));
    expect(await screen.findByRole('img', { name: `Match: ${fx.skill_gap.matchPercent} out of 100` })).toBeInTheDocument();
    expect(api.analyze).toHaveBeenCalledWith('skill-gap', { targetRole: 'Data Analyst', currentSkills: ['Excel', 'SQL'], experienceLevel: 'senior' });
    const g = fx.skill_gap.gaps[0]; expect(screen.getByText(g.skill)).toBeInTheDocument(); expect(screen.getAllByText(g.importance).length).toBeGreaterThan(0); expect(screen.getAllByText(`~${g.estimatedHours}h`).length).toBeGreaterThan(0);
  });
  it('pre-fills from the saved profile', async () => {
    const api = fakeApi({ me: vi.fn(async () => ({ ...ME, profile: { targetRole: 'Data Scientist', experienceLevel: 'senior', skills: ['python', 'sql'] } })) });
    renderApp(<SkillGapPage />, { api });
    await waitFor(() => expect(screen.getByLabelText('Target role')).toHaveValue('Data Scientist')); expect(screen.getByRole('button', { name: 'Remove python' })).toBeInTheDocument(); expect(screen.getByLabelText('Experience level')).toHaveValue('senior');
  });
  it('applying a scenario updates the experience level default', async () => {
    renderApp(<SkillGapPage />); await userEvent.click(await screen.findByRole('button', { name: 'Student / new graduate' })); expect(screen.getByLabelText('Experience level')).toHaveValue('entry');
  });
});

describe('Roadmap', () => {
  it('validates, then sends numeric values and renders phases, resources and risks', async () => {
    const { api } = renderApp(<RoadmapPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Build my roadmap' })); expect(await screen.findByText(/at least 10 characters/)).toBeInTheDocument(); expect(api.analyze).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Your current background/), 'Teacher who uses Excel daily'); await userEvent.type(screen.getByLabelText('Target role'), 'Data Analyst');
    await userEvent.selectOptions(screen.getByLabelText('Timeframe'), '12'); await userEvent.clear(screen.getByLabelText('Hours per week')); await userEvent.type(screen.getByLabelText('Hours per week'), '8');
    await userEvent.click(screen.getByRole('button', { name: 'Build my roadmap' }));
    expect(await screen.findByText(new RegExp(`${fx.roadmap.totalWeeks}-week roadmap`))).toBeInTheDocument();
    expect(api.analyze).toHaveBeenCalledWith('roadmap', expect.objectContaining({ timeframeMonths: 12, hoursPerWeek: 8, targetRole: 'Data Analyst', learningStyle: 'mixed' }));
    for (const p of fx.roadmap.phases) expect(screen.getAllByText(p.title).length).toBeGreaterThan(0);
    expect(screen.getByText('First week')).toBeInTheDocument(); expect(screen.getByText('Watch out for')).toBeInTheDocument();
  });
  it('rejects out-of-range hours per week', async () => {
    renderApp(<RoadmapPage />); await userEvent.type(screen.getByLabelText(/Your current background/), 'Some background here'); await userEvent.type(screen.getByLabelText('Target role'), 'Dev');
    await userEvent.clear(screen.getByLabelText('Hours per week')); await userEvent.type(screen.getByLabelText('Hours per week'), '99'); await userEvent.click(screen.getByRole('button', { name: 'Build my roadmap' }));
    expect(await screen.findByText('Enter 1-60 hours per week')).toBeInTheDocument();
  });
});

describe('Interview prep + answer practice', () => {
  it('generates questions, expands one, and gives feedback on a practice answer linked to the report', async () => {
    const { api } = renderApp(<InterviewPage />);
    await userEvent.type(screen.getByLabelText('Role'), 'Backend Developer'); await userEvent.selectOptions(screen.getByLabelText('Level'), 'senior'); await userEvent.selectOptions(screen.getByLabelText('Questions'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Generate questions' }));
    const q = fx.interview.questions[0]; await userEvent.click(await screen.findByRole('button', { name: new RegExp(q.question.slice(0, 30)) }));
    expect(api.analyze).toHaveBeenCalledWith('interview', { role: 'Backend Developer', level: 'senior', interviewType: 'mixed', numQuestions: 5 });
    expect(await screen.findByText(q.whyAsked)).toBeInTheDocument();
    const answerBox = screen.getByLabelText('Your answer'); const feedbackBtn = screen.getByRole('button', { name: 'Get feedback' }); expect(feedbackBtn).toBeDisabled();
    await userEvent.click(answerBox); await userEvent.paste('When our team was behind on a launch, I decided to reorganise the backlog and cut scope by 30%, so we shipped on time.');
    expect(feedbackBtn).toBeEnabled(); await userEvent.click(feedbackBtn);
    const card = await screen.findByTestId('answer-feedback'); expect(within(card).getByText(fx.answer_feedback.verdict)).toBeInTheDocument(); expect(within(card).getByRole('img', { name: /Answer/ })).toBeInTheDocument();
    expect(api.analyze).toHaveBeenLastCalledWith('interview-feedback', { question: q.question, answer: expect.stringContaining('reorganise the backlog'), role: fx.interview.role, reportId: '11111111-1111-4111-8111-111111111111' });
  });
  it('requires a role', async () => { const { api } = renderApp(<InterviewPage />); await userEvent.click(screen.getByRole('button', { name: 'Generate questions' })); expect(await screen.findByText(/Role must be at least 2/)).toBeInTheDocument(); expect(api.analyze).not.toHaveBeenCalled(); });
});
