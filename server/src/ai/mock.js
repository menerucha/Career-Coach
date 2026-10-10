import { WORKFLOWS, normalize } from '../schemas.js';
import { findRole, learnHint, normSkill, roleSkills, skillsFromText } from './skills.js';

/**
 * Offline "coach" engine: deterministic heuristics + a skills taxonomy. It needs no API key, so the whole app works
 * (and is testable) without OpenAI. Output is grounded in the user's own text but far less nuanced than a real LLM.
 */
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const words = (s) => (s.match(/\S+/g) || []).length;
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, seed) { const r = rng(seed), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const VERBS = new Set(['led', 'built', 'designed', 'developed', 'created', 'launched', 'improved', 'increased', 'reduced', 'managed', 'delivered', 'implemented', 'optimized', 'optimised', 'analyzed', 'analysed', 'automated', 'streamlined', 'architected', 'drove', 'negotiated', 'mentored', 'coordinated', 'organized', 'organised', 'established', 'founded', 'grew', 'owned', 'shipped', 'migrated', 'refactored', 'resolved', 'saved', 'generated', 'trained', 'planned', 'produced', 'presented', 'researched', 'wrote', 'spearheaded', 'secured', 'won', 'cut', 'boosted', 'partnered', 'configured', 'deployed', 'tested', 'maintained', 'taught', 'supported']);
const WEAK = /\b(responsible for|duties (?:included|include)|helped (?:with|to)|worked on|assisted (?:with|in)|various|etc\.?)\b/i;
const BULLET = /^([-•*–·▪]|\d+[.)])\s+/;
const SECTION = { summary: /^(professional\s+)?(summary|profile|objective|about( me)?)\b/i, experience: /^(work\s+|professional\s+)?(experience|employment|work history)\b/i, education: /^education\b/i, skills: /^(technical\s+|key\s+)?skills\b/i, projects: /^projects?\b/i };

function rewriteBullet(b) {
  const verbs = ['Delivered', 'Built', 'Improved', 'Led', 'Streamlined'];
  let rest = b.replace(WEAK, '').replace(/^\s*[,:-]\s*/, '').replace(/\s+/g, ' ').trim().replace(/[.;]$/, '');
  const first = rest.split(' ')[0]?.toLowerCase();
  if (VERBS.has(first)) rest = cap(rest); else rest = `${verbs[hash(b) % verbs.length]} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
  return `${rest}, resulting in [a measurable outcome, e.g. "a 20% faster process" or "2,000 users served"].`;
}

// ------------------------------------------------------------------ resume
function resume(i) {
  const text = i.resumeText, lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => BULLET.test(l)).map((l) => l.replace(BULLET, ''));
  const body = bullets.length ? bullets : lines.filter((l) => words(l) >= 6);
  const n = Math.max(body.length, 1);
  const quant = body.filter((l) => /\d|%|\$/.test(l)), verbed = body.filter((l) => VERBS.has((l.split(/\s+/)[0] || '').toLowerCase())), weak = body.filter((l) => WEAK.test(l));
  const long = body.filter((l) => words(l) > 32);
  const has = Object.fromEntries(Object.entries(SECTION).map(([k, re]) => [k, lines.some((l) => re.test(l.replace(/[:]$/, '')))]));
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text), phone = /(\+?\d[\d\s().-]{8,}\d)/.test(text), link = /linkedin\.com|github\.com|portfolio|\.dev\b/i.test(text);
  const wc = words(text);
  const role = roleSkills(i.targetRole, i.jobDescription), wanted = [...role.core, ...role.nice];
  const found = new Set(skillsFromText(text));
  const present = wanted.filter((s) => found.has(s)), missing = wanted.filter((s) => !found.has(s));
  const coverage = (i.targetRole || i.jobDescription) && wanted.length ? present.length / wanted.length : Math.min(1, found.size / 10);

  const impact = clamp(25 + 55 * Math.min(1, quant.length / n / 0.5) + 20 * Math.min(1, verbed.length / n / 0.7));
  const clarity = clamp(82 - 12 * weak.length - 4 * long.length - (wc < 250 ? (250 - wc) / 5 : wc > 1000 ? (wc - 1000) / 15 : 0));
  const keywords = clamp(coverage * 100);
  const structure = clamp((has.experience ? 25 : 0) + (has.education ? 20 : 0) + (has.skills ? 20 : 0) + (has.summary ? 10 : 0) + (email ? 10 : 0) + (phone ? 5 : 0) + (link ? 10 : 0));
  const overall = clamp(0.35 * impact + 0.2 * clarity + 0.3 * keywords + 0.15 * structure);

  const imps = [];
  if (quant.length / n < 0.4) { const ex = body.find((l) => !/\d|%|\$/.test(l)) || body[0] || ''; imps.push({ issue: `Only ${quant.length} of ${body.length} bullets include numbers`, whyItMatters: 'Recruiters scan for measurable impact; numbers make claims credible and comparable.', suggestion: 'Add a metric (%, $, time saved, users, team size) to at least half of your bullets.', exampleRewrite: ex ? rewriteBullet(ex) : 'Reduced report turnaround from 3 days to 1 day by automating data pulls.' }); }
  if (weak.length) imps.push({ issue: `${weak.length} bullet(s) use passive or vague phrasing ("responsible for", "worked on"…)`, whyItMatters: 'Duty-style phrasing describes the job, not what you achieved in it.', suggestion: 'Start each bullet with a strong action verb and state the outcome.', exampleRewrite: rewriteBullet(weak[0]) });
  if (missing.length >= 3 && (i.targetRole || i.jobDescription)) imps.push({ issue: `Missing ${missing.length} keywords expected for ${i.targetRole || 'this job'}`, whyItMatters: 'Applicant tracking systems and recruiters filter on role keywords.', suggestion: `Where truthful, work in: ${missing.slice(0, 6).join(', ')}.`, exampleRewrite: `Skills: ${[...present.slice(0, 4), ...missing.slice(0, 3)].join(', ')}` });
  if (!has.summary) imps.push({ issue: 'No professional summary', whyItMatters: 'A 2-3 line summary frames your story in the first seconds of a skim.', suggestion: 'Add a short summary naming your role, strengths and one headline achievement.', exampleRewrite: `${titleCase(i.targetRole || 'Professional')} with experience in ${present.slice(0, 3).join(', ') || '[your top skills]'}; [one quantified achievement].` });
  if (!email || !(phone || link)) imps.push({ issue: 'Contact details look incomplete', whyItMatters: 'If a recruiter cannot reach you quickly, the rest does not matter.', suggestion: 'Include email plus phone or a LinkedIn/GitHub/portfolio link in the header.', exampleRewrite: 'Jane Doe · jane@email.com · +1 555 0100 · linkedin.com/in/janedoe' });
  if (wc < 250 || wc > 1000) imps.push({ issue: wc < 250 ? `Resume is short (${wc} words)` : `Resume is long (${wc} words)`, whyItMatters: 'Most resumes work best between roughly 300 and 800 words.', suggestion: wc < 250 ? 'Add detail on projects, results and tools used.' : 'Cut older or low-impact items; keep the most relevant 10-15 years.', exampleRewrite: 'Keep 3-5 bullets for recent roles and 1-2 for older ones.' });
  if (long.length) imps.push({ issue: `${long.length} bullet(s) are over 30 words`, whyItMatters: 'Long bullets bury the result.', suggestion: 'Split into two bullets or trim to one idea of 15-25 words.', exampleRewrite: rewriteBullet(long[0].split(/[,;]/)[0]) });
  if (!imps.length) imps.push({ issue: 'Tailor each version to the job', whyItMatters: 'Even strong resumes convert better when mirrored to the posting.', suggestion: 'Reorder bullets so the most relevant achievement comes first.', exampleRewrite: 'Move your closest-match project to the top of the experience section.' });

  const strengths = [];
  if (quant.length >= 2) strengths.push(`${quant.length} bullets contain quantified results`);
  if (verbed.length / n >= 0.6) strengths.push('Most bullets open with strong action verbs');
  if (has.experience && has.education && has.skills) strengths.push('Clear core sections: experience, education and skills');
  if (present.length >= 4) strengths.push(`Good keyword coverage: ${present.slice(0, 5).join(', ')}`);
  if (link) strengths.push('Includes a professional/portfolio link');
  if (!strengths.length) strengths.push('Content is present to build on; the main gains are in measurable impact and structure');

  const top = present.slice(0, 4);
  return {
    overallScore: overall,
    summary: `Your resume scores ${overall}/100${i.targetRole ? ` for ${i.targetRole}` : ''}. Biggest levers: ${[impact < 70 && 'quantify achievements', clarity < 70 && 'tighten phrasing', keywords < 60 && 'add role keywords', structure < 70 && 'complete the structure'].filter(Boolean).join(', ') || 'tailoring to each posting'}. (Generated by the offline heuristic engine.)`,
    sectionScores: [
      { name: 'Impact', score: impact, comment: `${quant.length}/${body.length} bullets quantified; ${verbed.length}/${body.length} start with action verbs.` },
      { name: 'Clarity', score: clarity, comment: `${wc} words; ${weak.length} vague bullet(s); ${long.length} overlong bullet(s).` },
      { name: 'Keywords/ATS', score: keywords, comment: wanted.length && (i.targetRole || i.jobDescription) ? `${present.length}/${wanted.length} expected keywords found.` : `${found.size} recognisable skills found; add a target role for a tailored check.` },
      { name: 'Structure', score: structure, comment: `Sections found: ${Object.entries(has).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}; contact: ${[email && 'email', phone && 'phone', link && 'link'].filter(Boolean).join(', ') || 'none'}.` },
    ],
    strengths, improvements: imps.slice(0, 6), missingKeywords: missing.slice(0, 15),
    rewrittenSummary: `${titleCase(i.targetRole || 'Professional')} with hands-on experience in ${top.join(', ') || '[your top 3 skills]'}. Known for [your strongest trait], with a track record of [headline achievement with a number]. Looking to bring this to ${i.targetRole ? `a ${i.targetRole} role` : '[target role]'}. (Draft: fill in the [brackets] with your real facts.)`,
  };
}

// ------------------------------------------------------------------ skill gap
const TRANSFERABLE = ['communication', 'leadership', 'project management', 'problem solving', 'collaboration', 'writing', 'excel', 'sql', 'data analysis', 'customer service', 'teaching', 'mentoring', 'negotiation', 'public speaking'];
function skillGap(i) {
  const role = roleSkills(i.targetRole, i.jobDescription);
  const have = new Set([...i.currentSkills.map(normSkill), ...skillsFromText(i.currentSkills.join(' , '))]);
  const tiers = [...role.core.map((s, k) => [s, k < 5 ? 'critical' : 'important']), ...role.nice.map((s) => [s, 'nice-to-have'])];
  const W = { critical: 3, important: 2, 'nice-to-have': 1 };
  const total = tiers.reduce((a, [, t]) => a + W[t], 0), got = tiers.filter(([s]) => have.has(s));
  const gaps = tiers.filter(([s]) => !have.has(s)).map(([skill, importance]) => { const h = learnHint(skill); return { skill, importance, whyItMatters: importance === 'critical' ? `${cap(skill)} is a core requirement for most ${i.targetRole} roles; its absence is usually a screening-stage blocker.` : importance === 'important' ? `${cap(skill)} appears in many ${i.targetRole} job descriptions and separates stronger candidates.` : `${cap(skill)} is a differentiator that helps you stand out once the basics are covered.`, howToLearn: h.how, estimatedHours: i.experienceLevel === 'senior' ? Math.round(h.hours * 0.6) : h.hours }; });
  const percent = total ? clamp((got.reduce((a, [, t]) => a + W[t], 0) / total) * 100) : 0;
  const roleSet = new Set(tiers.map(([s]) => s));
  const transferable = [...have].filter((s) => !roleSet.has(s) && TRANSFERABLE.includes(s));
  const crit = gaps.filter((g) => g.importance === 'critical');
  return {
    targetRole: i.targetRole, matchPercent: percent,
    summary: `You match about ${percent}% of the typical ${i.targetRole} skill set${role.known ? '' : ' (role not in the built-in taxonomy, so this is based on the job description or general professional skills)'}. ${crit.length ? `${crit.length} critical gap(s) to close first: ${crit.slice(0, 3).map((g) => g.skill).join(', ')}.` : 'No critical gaps found.'} (Offline heuristic engine.)`,
    matchedSkills: got.map(([s]) => s), transferableSkills: transferable, gaps,
    nextSteps: (gaps.length ? gaps.slice(0, 3).map((g) => `Start ${g.skill}: ${g.howToLearn}`) : ['Deepen what you already have with a portfolio project and apply to roles to test the market.']),
  };
}

// ------------------------------------------------------------------ roadmap
const RES_TYPES = { video: ['course', 'practice'], reading: ['book', 'docs'], 'hands-on': ['project', 'practice'], mixed: ['course', 'docs', 'project', 'community'] };
function roadmap(i) {
  const role = roleSkills(i.targetRole), have = new Set(skillsFromText(i.currentBackground));
  const total = Math.max(4, Math.round(i.timeframeMonths * 4.345)), budget = total * i.hoursPerWeek;
  const gaps = [...role.core, ...role.nice].filter((s) => !have.has(s)).map((s) => ({ skill: s, hours: learnHint(s).hours }));
  const w1 = Math.max(1, Math.round(total * 0.3)), w2 = Math.max(1, Math.round(total * 0.35)), w4 = Math.max(1, Math.round(total * 0.1)), w3 = Math.max(1, total - w1 - w2 - w4);
  const share = (frac) => budget * frac; let used = 0; const take = (cap_) => { const out = []; let h = 0; while (gaps.length && (out.length === 0 || h + gaps[0].hours <= cap_)) { const g = gaps.shift(); out.push(g); h += g.hours; } used += h; return out; };
  const p1 = take(share(0.3)), p2 = take(share(0.35)); const leftover = gaps.map((g) => g.skill);
  const types = RES_TYPES[i.learningStyle], R = (sk, k) => ({ title: `${titleCase(sk)} — ${{ course: 'structured course', book: 'foundational book/guide', docs: 'official documentation', practice: 'exercise set', project: 'guided project', community: 'study group or forum' }[types[k % types.length]]}`, type: types[k % types.length], searchHint: `${sk} ${i.learningStyle === 'video' ? 'video course' : i.learningStyle === 'reading' ? 'in-depth guide' : 'hands-on tutorial'} for ${i.targetRole}` });
  const mk = (title, weeks, skills, goals, act, milestone, project) => ({ title, weeks, goals, skills, activities: act, resources: skills.slice(0, 4).map(R), milestone, project });
  const learned = [...p1, ...p2].map((g) => g.skill);
  const phases = [
    mk('Foundations', w1, p1.map((g) => g.skill), [`Build a solid base in ${p1.map((g) => g.skill).join(', ') || 'the fundamentals'}`, 'Set up a weekly study routine'], [`Study ${Math.round(i.hoursPerWeek * 0.7)}h/week of core material`, `Spend ${Math.round(i.hoursPerWeek * 0.3)}h/week on practice exercises`, 'Keep a learning log'], `Explain ${p1[0]?.skill || 'the basics'} to a friend without notes`, `A small ${role.key || i.targetRole} exercise using ${p1[0]?.skill || 'your new skills'}`),
    mk('Core skills', w2, p2.map((g) => g.skill), [`Gain working ability in ${p2.map((g) => g.skill).join(', ') || 'intermediate topics'}`, 'Start applying skills to realistic problems'], ['Alternate learning with mini-projects', 'Join a community and ask for feedback weekly'], 'Complete a realistic task end to end', 'A mid-sized project combining two or more skills'),
    mk('Portfolio & proof', w3, learned.slice(0, 3), ['Produce 1-2 portfolio pieces employers can inspect', 'Document decisions and results'], ['Build in public (repo, case study or write-up)', 'Get feedback from 2 practitioners'], 'Portfolio published with clear write-ups', `A capstone for ${i.targetRole} showing measurable results`),
    mk('Job search & interviews', w4, ['resume', 'interviewing', 'networking'], ['Tailor your resume and profile', 'Practise interviews and apply consistently'], ['Apply to 5-10 roles per week', 'Do 2 mock interviews weekly', 'Message 3 people in the field weekly'], 'Interviews scheduled', 'A one-page story of your transition and proof of skills'),
  ];
  return {
    targetRole: i.targetRole, totalWeeks: total,
    summary: `${total}-week plan to move toward ${i.targetRole} at ${i.hoursPerWeek}h/week (~${budget}h total), prioritising ${learned.slice(0, 3).join(', ') || 'fundamentals'}. (Offline heuristic engine.)`,
    phases,
    firstWeekActions: ['Block fixed study slots in your calendar', `Pick one beginner resource for ${p1[0]?.skill || 'your first skill'} and finish the first module`, 'Write your target job title and 3 postings you would like to qualify for', 'Find one practitioner to follow or message'],
    risks: [...(leftover.length ? [`Time budget is tight: ${leftover.slice(0, 4).join(', ')} did not fit; revisit after the first milestone or extend the timeline`] : []), i.hoursPerWeek < 6 ? 'Low weekly hours mean slow progress; protect consistency over intensity' : 'Burnout from over-scheduling; keep one rest day a week', 'Tutorial hell: prefer building things over finishing endless courses'],
  };
}

// ------------------------------------------------------------------ interview
const EV = { behavioral: ['A specific, recent example', 'Your personal actions (use "I")', 'A measurable result and what you learned'], technical: ['Clear explanation of the underlying concept', 'A concrete example or trade-off', 'Awareness of edge cases and alternatives'], 'system-design': ['Clarifying requirements and constraints first', 'A high-level design with the main components', 'Trade-offs, bottlenecks and how you would scale or monitor'], situational: ['Structured reasoning before acting', 'Consideration of stakeholders and risks', 'A clear decision and how you would measure success'], culture: ['Self-awareness and honesty', 'Alignment of your values with the team', 'A concrete example that shows it'] };
const OUT = { behavioral: 'Situation (1-2 sentences) → Task → Action (2-3 concrete steps you took) → Result (quantified) → Lesson.', technical: 'Define it → give a concrete example → discuss trade-offs → mention a time you used it.', 'system-design': 'Clarify requirements → estimate scale → sketch components and data flow → deep-dive the riskiest part → trade-offs and monitoring.', situational: 'Restate the problem → list options → pick one with reasons → say how you would verify it worked.', culture: 'Answer directly → support with a short story → connect to what you want from the team.' };
const BANK = {
  behavioral: [['Tell me about a time you had to learn something quickly to deliver a result.', 'Tests learning agility.'], ['Describe a time you disagreed with a teammate. How did you handle it?', 'Tests collaboration and conflict handling.'], ['Tell me about your proudest professional achievement.', 'Tests ownership and what you value.'], ['Describe a mistake you made at work and what you did about it.', 'Tests accountability and growth.'], ['Tell me about a time you had to meet a tight deadline.', 'Tests prioritisation under pressure.'], ['Describe a time you influenced a decision without formal authority.', 'Tests leadership and communication.'], ['Tell me about a time you received difficult feedback.', 'Tests coachability.'], ['Describe a time you took initiative beyond your job description.', 'Tests ownership.'], ['Tell me about a time a project did not go to plan. What happened next?', 'Tests resilience and adaptability.'], ['Describe a time you had to work with someone whose style was very different from yours.', 'Tests collaboration.'], ['Tell me about a time you simplified something complicated for others.', 'Tests communication.']],
  situational: [['Your top two priorities conflict and you cannot do both this week. What do you do?', 'Tests prioritisation and communication.'], ['A stakeholder asks for something you believe is the wrong solution. How do you respond?', 'Tests influence and empathy.'], ['You discover a significant issue the day before a launch. What are your next steps?', 'Tests judgement under pressure.'], ['You inherit a project with unclear goals. How do you get it on track?', 'Tests structure and ambition.'], ['A teammate is struggling and it is affecting delivery. What do you do?', 'Tests support and escalation judgement.']],
  culture: [['What kind of team environment helps you do your best work?', 'Tests fit and self-awareness.'], ['Why do you want to work in this field and at this stage of your career?', 'Tests motivation.'], ['How do you stay current in your field?', 'Tests curiosity.']],
  software: [['Explain the difference between synchronous and asynchronous code and when you would choose each.', 'Tests core engineering concepts.'], ['How do you approach debugging a problem you have never seen before?', 'Tests problem solving.'], ['What makes a good code review, as author and reviewer?', 'Tests engineering collaboration.'], ['How do you decide what to test, and at which level?', 'Tests testing strategy.'], ['Walk me through how a request travels from a browser to a database and back.', 'Tests systems understanding.'], ['Describe how you would improve the performance of a slow page or query.', 'Tests measurement-driven optimisation.']],
  data: [['How would you check whether an A/B test result is trustworthy?', 'Tests statistical thinking.'], ['Walk me through how you would clean and validate a messy dataset.', 'Tests data hygiene.'], ['Explain a p-value to a non-technical stakeholder.', 'Tests communication of statistics.'], ['How would you choose a metric to evaluate a model or product change?', 'Tests metric design.'], ['Describe how you would find the cause of a sudden drop in a key metric.', 'Tests analytical structure.']],
  product: [['How would you prioritise a backlog with limited engineering capacity?', 'Tests prioritisation frameworks.'], ['Describe how you would decide whether to build a new feature.', 'Tests product judgement.'], ['How do you measure the success of a launch?', 'Tests metrics thinking.'], ['Tell me about a product you love and what you would change.', 'Tests product sense.']],
  design: [['Walk me through your design process on a recent project.', 'Tests process and rationale.'], ['How do you handle feedback that conflicts with your research?', 'Tests evidence-based design.'], ['How do you make a design accessible?', 'Tests inclusive design.'], ['How do you decide when a design is good enough to ship?', 'Tests pragmatism.']],
  marketing: [['How would you plan a campaign with a fixed budget?', 'Tests planning and allocation.'], ['Which metrics tell you a campaign is working?', 'Tests analytics thinking.'], ['Describe how you would improve conversion on a landing page.', 'Tests experimentation.'], ['How do you tailor messaging to different audiences?', 'Tests segmentation.']],
  generic: [['Walk me through the core responsibilities of this role and where you add the most value.', 'Tests role understanding.'], ['Describe your approach to planning and prioritising your work.', 'Tests organisation.'], ['Tell me about a process you improved.', 'Tests initiative.'], ['How do you communicate progress and problems to stakeholders?', 'Tests communication.']],
};
const SYSTEM = [['Design a URL shortener. How would you handle scale and failures?', 'Tests system design fundamentals.'], ['Design a notification service that sends millions of messages a day.', 'Tests queues, retries and fan-out.'], ['How would you design a rate limiter for a public API?', 'Tests algorithms and distributed trade-offs.'], ['Design the data model and API for a simple booking system.', 'Tests modelling and consistency.']];
const family = (role) => { const r = role.toLowerCase(); return /(data|analyst|scientist|machine learning|\bml\b)/.test(r) ? 'data' : /(product manager|product owner)/.test(r) ? 'product' : /(design|ux|\bui\b)/.test(r) ? 'design' : /(marketing|growth|seo)/.test(r) ? 'marketing' : /(develop|engineer|software|devops|backend|frontend|full.?stack|sre)/.test(r) ? 'software' : 'generic'; };

function interview(i) {
  const fam = family(i.role), seed = hash(`${i.role}|${i.level}|${i.interviewType}|${(i.resumeText || '').length}`);
  const tag = (list, cat) => list.map(([q, why]) => [q, why, cat]);
  const sh = (list, k) => shuffle(list, seed + k);
  // Tiered candidate lists: the requested category first, then sensible fallbacks, so we never run short of questions.
  const candidates = {
    behavioral: () => [...tag(sh(BANK.behavioral, 1), 'behavioral'), ...tag(sh(BANK.situational, 2), 'situational')],
    situational: () => [...tag(sh(BANK.situational, 3), 'situational'), ...tag(sh(BANK.behavioral, 4), 'behavioral')],
    culture: () => [...tag(sh(BANK.culture, 5), 'culture'), ...tag(sh(BANK.behavioral, 6), 'behavioral')],
    technical: () => [...tag(sh(BANK[fam], 7), 'technical'), ...(fam === 'generic' ? [] : tag(sh(BANK.generic, 8), 'technical')), ...tag(sh(BANK.situational, 9), 'situational'), ...tag(sh(BANK.behavioral, 10), 'behavioral')],
    'system-design': () => [...(fam === 'software' ? tag(sh(SYSTEM, 11), 'system-design') : []), ...tag(sh(BANK.situational, 12), 'situational'), ...tag(sh(BANK.behavioral, 13), 'behavioral')],
  };
  const seq = i.interviewType === 'mixed' ? ['behavioral', 'technical', 'situational', fam === 'software' ? 'system-design' : 'behavioral', 'culture'] : [i.interviewType];
  const used = new Set(), lists = {}, qs = [];
  const next = (cat) => { lists[cat] ||= candidates[cat](); while (lists[cat].length) { const c = lists[cat].shift(); if (!used.has(c[0])) { used.add(c[0]); return c; } } return null; };
  for (let k = 0; qs.length < i.numQuestions && k < 300; k++) {
    const c = next(seq[k % seq.length]) || next('behavioral') || next('situational') || next('technical') || next('culture');
    if (!c) break;
    qs.push({ question: c[0], category: c[2], whyAsked: c[1], strongAnswerIncludes: EV[c[2]], answerOutline: OUT[c[2]] });
  }
  const senior = ['senior', 'lead'].includes(i.level);
  const resumeSkills = i.resumeText ? skillsFromText(i.resumeText).slice(0, 3) : [];
  return {
    role: i.role, level: i.level, interviewType: i.interviewType, questions: qs,
    tips: ['Prepare 5 stories from your experience that can be adapted to many behavioural questions.', 'Practise answers out loud and time them to roughly 90-150 seconds.', senior ? 'At your level, emphasise scope, trade-offs, mentoring and results across teams.' : 'Show how you learn: describe what you tried, what failed and what you changed.', ...(resumeSkills.length ? [`Be ready to go deep on ${resumeSkills.join(', ')}; they are on your resume.`] : []), 'Prepare 3 thoughtful questions to ask the interviewer.'],
  };
}

// ------------------------------------------------------------------ answer feedback
function answerFeedback(i) {
  const a = i.answer, wc = words(a), sentences = a.split(/(?<=[.!?])\s+/).filter(Boolean);
  const star = { situation: /\b(when|during|while|at (my|the) (previous|last|current)|in my (role|project|team)|our team|we were|the situation|context)\b/i.test(a), task: /\b(my (task|goal|responsibility|role)|i (was|had been) (asked|responsible|tasked)|needed to|had to|objective|challenge|goal was)\b/i.test(a), action: /\bi (decided|built|created|led|implemented|designed|analy[sz]ed|organi[sz]ed|proposed|wrote|developed|started|set up|worked|reached out|negotiated|automated|reviewed)\b/i.test(a), result: /\b(result(ed|ing)?|as a result|outcome|reduced|increased|improved|saved|achieved|delivered|learned|grew|\d+\s?%|\d+)\b/i.test(a) };
  const nums = /\d/.test(a), I = (a.match(/\bI\b/g) || []).length, we = (a.match(/\bwe\b/gi) || []).length, fillers = (a.match(/\b(um+|uh+|basically|kind of|sort of|you know|like,)\b/gi) || []).length;
  const score = clamp(20 + 15 * Object.values(star).filter(Boolean).length + (nums ? 8 : 0) + (wc >= 90 && wc <= 260 ? 12 : wc >= 60 ? 6 : 0) + (I >= we ? 5 : 0) - 3 * fillers);
  const strengths = [], improvements = [];
  const names = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result' };
  Object.entries(star).forEach(([k, v]) => (v ? strengths.push(`${names[k]} is covered`) : improvements.push(`Add the ${names[k].toLowerCase()}: ${{ situation: 'set the scene in one or two sentences', task: 'state your specific goal or responsibility', action: 'describe the concrete steps YOU took', result: 'finish with a quantified outcome and a lesson' }[k]}`)));
  if (nums) strengths.push('Includes numbers that make the impact concrete'); else improvements.push('Quantify the result (%, time, money, people affected)');
  if (we > I * 2) improvements.push('Use "I" more than "we" so your personal contribution is clear');
  if (wc < 60) improvements.push('The answer is very short; aim for roughly 90-250 words'); else if (wc > 300) improvements.push('Tighten to about 2 minutes spoken (around 250 words)');
  if (fillers) improvements.push(`Cut filler phrases (${fillers} found)`);
  if (!strengths.length) strengths.push('You have a starting point to build on');
  return {
    score, verdict: score >= 80 ? 'Strong answer: polish the details.' : score >= 60 ? 'Decent answer with clear room to sharpen.' : 'Needs structure: rebuild it around Situation, Task, Action, Result.',
    strengths, improvements, starCoverage: star,
    improvedAnswer: [`Situation: ${sentences[0] || '[Set the scene in one or two sentences.]'}`, `Task: ${star.task ? (sentences.find((s) => /task|goal|responsib|needed|had to/i.test(s)) || sentences[1]) : '[State your specific responsibility or goal.]'}`, `Action: ${sentences.find((s) => /\bI\b/.test(s) && s !== sentences[0]) || '[Describe 2-3 concrete steps YOU took.]'}`, `Result: ${star.result && nums ? (sentences.find((s) => /\d/.test(s)) || sentences[sentences.length - 1]) : '[Quantify the outcome and what you learned.]'}`].join('\n') + '\n(Template built from your own sentences; fill the [brackets] with real details.)',
  };
}

const HANDLERS = { resume, skill_gap: skillGap, roadmap, interview, answer_feedback: answerFeedback };

export class MockEngine {
  constructor() { this.name = 'mock'; this.model = 'offline-heuristics'; }
  async run(kind, input) {
    const raw = HANDLERS[kind](input);
    const parsed = WORKFLOWS[kind].output.parse(raw);      // our own output must satisfy the same contract as the LLM's
    return normalize(kind, parsed);
  }
}
