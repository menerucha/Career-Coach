// End-to-end smoke test against a RUNNING stack (through the client's /api proxy by default).
//   SMOKE_TOKEN=<bearer for user A> SMOKE_TOKEN_2=<bearer for user B> node scripts/smoke.mjs [baseUrl]
const BASE = process.argv[2] || 'http://localhost:5173';
const A = process.env.SMOKE_TOKEN || 'demo.smokea', B = process.env.SMOKE_TOKEN_2 || 'demo.smokeb';
let failed = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? '  PASS' : '  FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!c) failed++; };
const call = async (method, path, token, body) => { const r = await fetch(`${BASE}/api${path}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j }; };

const html = await fetch(BASE + '/').then((r) => r.text());
ok(/<title>AI Career Coach<\/title>/.test(html) && /assets\/index-.*\.js/.test(html), 'serves the built single-page app');
const health = await call('GET', '/health'); ok(health.status === 200, 'health', JSON.stringify(health.body));
ok((await call('GET', '/me')).status === 401, 'API rejects requests without a token');
ok((await call('GET', '/me', 'not-a-valid-token')).status === 401, 'API rejects an invalid token');
const me = await call('GET', '/me', A); ok(me.status === 200 && me.body.quota.remaining > 0, 'authenticated /me', `user=${me.body?.userId} engine=${me.body?.engine} quota=${JSON.stringify(me.body?.quota)}`);
ok((await call('GET', '/scenarios')).body.scenarios.length >= 5, '5+ scenario presets');

const resumeText = `Jane Doe\njane@example.com | linkedin.com/in/janedoe\n\nSummary\nFrontend developer.\n\nExperience\n- Built a React design system used by 12 teams, cutting UI bugs by 30%\n- Responsible for various testing tasks\n\nEducation\nBSc Computer Science\n\nSkills\nJavaScript, React, CSS, Git ${'and some more words '.repeat(15)}`;
const made = {};
for (const [slug, body] of Object.entries({
  resume: { resumeText, targetRole: 'Frontend Developer', scenario: 'career-changer' },
  'skill-gap': { targetRole: 'Data Analyst', currentSkills: ['Excel', 'SQL'], experienceLevel: 'mid' },
  roadmap: { currentBackground: 'Teacher who uses Excel and wants to move into data.', targetRole: 'Data Analyst', timeframeMonths: 6, hoursPerWeek: 8, learningStyle: 'mixed' },
  interview: { role: 'Backend Developer', level: 'mid', interviewType: 'mixed', numQuestions: 5 },
})) { const r = await call('POST', `/analyze/${slug}`, A, body); ok(r.status === 201 && r.body.report?.output, `workflow: ${slug}`, `engine=${r.body?.report?.engine} remaining=${r.body?.quota?.remaining}`); made[slug] = r.body?.report; }
const fb = await call('POST', '/analyze/interview-feedback', A, { question: made.interview?.output.questions[0].question, answer: 'When our team was behind, I decided to cut scope by 30%, built a plan, and as a result we shipped on time.', reportId: made.interview?.id });
ok(fb.status === 201 && fb.body.report.output.starCoverage, 'workflow: interview answer feedback', `score=${fb.body?.report?.output?.score}`);
ok(made.resume?.output.overallScore >= 0 && made['skill-gap']?.output.matchPercent >= 0 && made.roadmap?.output.phases.length >= 3 && made.interview?.output.questions.length === 5, 'outputs have the expected shape');

const list = await call('GET', '/reports?limit=50', A); ok(list.body.items.length >= 5, 'history lists saved reports', `${list.body?.items.length} items`);
ok((await call('GET', `/reports/${made.resume.id}`, A)).body.report.output.overallScore === made.resume.output.overallScore, 'saved report round-trips');
ok((await call('GET', `/reports/${made.resume.id}`, B)).status === 404, "another user cannot read the report");
ok((await call('DELETE', `/reports/${made.resume.id}`, B)).status === 404, "another user cannot delete the report");
ok((await call('POST', '/analyze/resume', A, { resumeText: 'short' })).status === 400, 'validation error is a 400');
ok((await call('PUT', '/profile', A, { targetRole: 'Data Analyst', experienceLevel: 'mid', skills: ['sql'] })).status === 200, 'profile saved');
ok((await call('DELETE', `/reports/${made.resume.id}`, A)).status === 204 && (await call('GET', `/reports/${made.resume.id}`, A)).status === 404, 'owner can delete');
const after = await call('GET', '/me', A); ok(after.body.quota.used === me.body.quota.used + 5, 'quota counts usage and is not refunded by deleting', JSON.stringify(after.body.quota));
console.log(failed ? `\n${failed} FAILED` : '\nAll smoke checks passed'); process.exit(failed ? 1 : 0);
