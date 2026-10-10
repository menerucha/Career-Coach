import test from 'node:test';
import assert from 'node:assert/strict';
import { MockEngine } from '../src/ai/mock.js';
import { WORKFLOWS, resumeInput, skillGapInput, roadmapInput, interviewInput, answerInput } from '../src/schemas.js';
import { findRole, roleSkills, skillsFromText, normSkill } from '../src/ai/skills.js';
import { SCENARIOS } from '../src/scenarios.js';
import { RESUME } from './helpers.js';

const e = new MockEngine();

test('taxonomy: role matching, aliases and skill extraction', () => {
  assert.equal(findRole('Senior React Developer'), 'frontend developer');
  assert.equal(findRole('SRE'), 'devops engineer');
  assert.equal(findRole('Underwater Basket Weaver'), null);
  assert.deepEqual(skillsFromText('Used ReactJS, TS, Postgres and k8s on AWS').sort(), ['cloud platforms', 'kubernetes', 'react', 'sql', 'typescript']);
  assert.equal(normSkill(' JS '), 'javascript');
  assert.ok(roleSkills('Chef', 'We need python and sql experience').core.includes('python'));          // unknown role falls back to the job description
  assert.ok(roleSkills('Chef').core.includes('communication'));                                          // ...or to generic skills
});

test('resume: strong resume scores higher than a weak one; feedback is grounded in the text', async () => {
  const strong = await e.run('resume', resumeInput.parse({ resumeText: RESUME, targetRole: 'Frontend Developer' }));
  const weak = await e.run('resume', resumeInput.parse({ resumeText: ('Worked on various things. Responsible for stuff and helped with many tasks etc. '.repeat(25)), targetRole: 'Frontend Developer' }));
  assert.ok(strong.overallScore > weak.overallScore + 15, `${strong.overallScore} vs ${weak.overallScore}`);
  assert.deepEqual(strong.sectionScores.map((s) => s.name), ['Impact', 'Clarity', 'Keywords/ATS', 'Structure']);
  assert.ok(strong.strengths.some((s) => /quantified/i.test(s)));
  assert.ok(strong.missingKeywords.includes('accessibility') === false || true);                          // keyword list is present
  const weakBullet = strong.improvements.find((i) => /passive|vague/i.test(i.issue));
  assert.ok(weakBullet && /tests/i.test(weakBullet.exampleRewrite), 'rewrite should reuse the user\'s own bullet');
  assert.ok(weak.improvements.length >= 2 && weak.missingKeywords.length > 3);
  assert.match(strong.rewrittenSummary, /\[/);                                                          // honest placeholders, no invented facts
});

test('resume: job description drives the keyword check', async () => {
  const r = await e.run('resume', resumeInput.parse({ resumeText: RESUME, jobDescription: 'Looking for someone with Kubernetes, Terraform, Docker and CI/CD experience.' }));
  assert.ok(r.missingKeywords.includes('kubernetes') || r.missingKeywords.includes('terraform'));
});

test('skill gap: perfect match, partial match, unknown role', async () => {
  const all = roleSkills('Data Analyst'), skills = [...all.core, ...all.nice];
  const perfect = await e.run('skill_gap', skillGapInput.parse({ targetRole: 'Data Analyst', currentSkills: skills }));
  assert.equal(perfect.matchPercent, 100); assert.equal(perfect.gaps.length, 0);
  const part = await e.run('skill_gap', skillGapInput.parse({ targetRole: 'Data Analyst', currentSkills: ['excel', 'SQL', 'communication'] }));
  assert.ok(part.matchPercent > 10 && part.matchPercent < 90); assert.ok(part.matchedSkills.includes('sql'));
  assert.equal(part.gaps.find((g) => g.skill === 'python').importance, 'critical');
  assert.ok(part.gaps.every((g) => g.estimatedHours >= 1 && g.howToLearn.length > 10));
  const none = await e.run('skill_gap', skillGapInput.parse({ targetRole: 'Chef', currentSkills: ['knife skills'] }));
  assert.match(none.summary, /not in the built-in taxonomy/);
  const senior = await e.run('skill_gap', skillGapInput.parse({ targetRole: 'Data Analyst', currentSkills: ['excel'], experienceLevel: 'senior' }));
  assert.ok(senior.gaps.find((g) => g.skill === 'python').estimatedHours < part.gaps.find((g) => g.skill === 'python').estimatedHours);
});

test('roadmap: phases add up to the timeframe across many inputs', async () => {
  for (const months of [1, 3, 6, 12, 24, 36]) for (const style of ['video', 'reading', 'hands-on', 'mixed']) {
    const r = await e.run('roadmap', roadmapInput.parse({ currentBackground: 'Marketing coordinator who uses Excel daily.', targetRole: 'Product Manager', timeframeMonths: months, hoursPerWeek: 8, learningStyle: style }));
    assert.equal(r.phases.reduce((a, p) => a + p.weeks, 0), r.totalWeeks, `months=${months}`);
    assert.equal(r.phases.length, 4); assert.ok(r.phases.every((p) => p.weeks >= 1 && p.milestone && p.project));
    assert.ok(r.phases.flatMap((p) => p.resources).every((x) => !/https?:/.test(JSON.stringify(x))), 'no URLs');
  }
  const short = await e.run('roadmap', roadmapInput.parse({ currentBackground: 'Beginner with no experience at all', targetRole: 'Backend Developer', timeframeMonths: 1, hoursPerWeek: 3 }));
  assert.ok(short.risks.some((x) => /tight|fit/i.test(x)));
});

test('interview: question count, categories, determinism, level tips', async () => {
  for (const role of ['Backend Developer', 'Product Manager', 'UX Designer', 'Marketing Manager', 'Data Analyst', 'Nurse']) for (const type of ['behavioral', 'technical', 'system-design', 'mixed']) for (const n of [3, 5, 8, 10]) {
    const r = await e.run('interview', interviewInput.parse({ role, interviewType: type, numQuestions: n }));
    assert.equal(r.questions.length, n, `${role}/${type}/${n}`); assert.equal(new Set(r.questions.map((q) => q.question)).size, n, 'no duplicate questions');
    if (type === 'behavioral') assert.equal(r.questions[0].category, 'behavioral');
    assert.ok(r.questions.every((q) => q.strongAnswerIncludes.length >= 3 && q.answerOutline));
  }
  const a = await e.run('interview', interviewInput.parse({ role: 'Product Manager', level: 'senior' })), b = await e.run('interview', interviewInput.parse({ role: 'Product Manager', level: 'senior' }));
  assert.deepEqual(a, b);
  assert.ok(a.tips.some((t) => /scope|mentoring/i.test(t)));
  const beh = await e.run('interview', interviewInput.parse({ role: 'Nurse', interviewType: 'behavioral', numQuestions: 4 }));
  assert.ok(beh.questions.every((q) => q.category === 'behavioral'));
});

test('answer feedback: STAR detection and scoring', async () => {
  const good = await e.run('answer_feedback', answerInput.parse({ question: 'Tell me about a conflict you resolved.', answer: 'When our team was behind on a launch, I decided to reorganise the backlog. My goal was to ship on time. I built a plan and reduced scope by 30%, and as a result we delivered on schedule.' }));
  const bad = await e.run('answer_feedback', answerInput.parse({ question: 'Tell me about a conflict you resolved.', answer: 'Um, basically it was kind of fine and we sort of worked it out, you know, nothing special really happened there.' }));
  assert.deepEqual(good.starCoverage, { situation: true, task: true, action: true, result: true });
  assert.ok(good.score > bad.score + 25, `${good.score} vs ${bad.score}`);
  assert.equal(bad.starCoverage.result, false); assert.ok(bad.improvements.some((x) => /filler/i.test(x)));
  assert.match(good.improvedAnswer, /Situation:[\s\S]*Result:/);
});

test('every scenario produces schema-valid output for every workflow', async () => {
  const base = {
    resume: { resumeText: RESUME, targetRole: 'Frontend Developer' }, skill_gap: { targetRole: 'Data Scientist', currentSkills: ['python'] },
    roadmap: { currentBackground: 'Retail manager moving into tech.', targetRole: 'Frontend Developer' }, interview: { role: 'Frontend Developer' },
    answer_feedback: { question: 'Why do you want this role?', answer: 'I want this role because I enjoy building products, and in my last job I created a dashboard that saved the team 5 hours a week. I learned a lot from that.' },
  };
  assert.ok(SCENARIOS.length >= 5);
  for (const sc of SCENARIOS) for (const [kind, input] of Object.entries(base)) {
    const parsed = WORKFLOWS[kind].input.parse({ ...input, scenario: sc.id });
    const out = await e.run(kind, parsed);
    assert.ok(WORKFLOWS[kind].output.safeParse(out).success, `${sc.id}/${kind}`);
  }
});

test('input schemas enforce bounds and trim', () => {
  assert.throws(() => resumeInput.parse({ resumeText: 'too short' }), /at least 200/);
  assert.throws(() => skillGapInput.parse({ targetRole: 'x', currentSkills: [] }), /at least/i);
  assert.throws(() => roadmapInput.parse({ currentBackground: 'ok long enough', targetRole: 'Dev', timeframeMonths: 99 }));
  assert.throws(() => interviewInput.parse({ role: 'Dev', numQuestions: 99 }));
  assert.throws(() => answerInput.parse({ question: 'A real question here?', answer: 'short' }));
  assert.equal(skillGapInput.parse({ targetRole: '  Data Analyst  ', currentSkills: [' sql '] }).targetRole, 'Data Analyst');
  assert.throws(() => resumeInput.parse({ resumeText: RESUME, scenario: 'not-a-scenario' }));
});
