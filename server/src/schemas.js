import { z } from 'zod';
import { SCENARIO_IDS } from './scenarios.js';

// ------------------------------------------------------------------ request schemas (validated, trimmed, bounded)
const text = (min, max, label) => z.string({ required_error: `${label} is required` }).trim().min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`);
const optText = (max) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const scenario = z.enum(SCENARIO_IDS).optional();
export const LEVELS = ['entry', 'mid', 'senior'];
export const INTERVIEW_LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead'];
export const INTERVIEW_TYPES = ['behavioral', 'technical', 'system-design', 'mixed'];
export const LEARNING_STYLES = ['video', 'reading', 'hands-on', 'mixed'];

export const resumeInput = z.object({ resumeText: text(200, 15000, 'Resume text'), targetRole: optText(100), jobDescription: optText(8000), scenario });
export const skillGapInput = z.object({
  targetRole: text(2, 100, 'Target role'), currentSkills: z.array(z.string().trim().min(1).max(60)).min(1, 'Add at least one skill').max(50, 'At most 50 skills'),
  experienceLevel: z.enum(LEVELS).default('mid'), jobDescription: optText(8000), scenario,
});
export const roadmapInput = z.object({
  currentBackground: text(10, 1500, 'Current background'), targetRole: text(2, 100, 'Target role'), timeframeMonths: z.coerce.number().int().min(1).max(36).default(6),
  hoursPerWeek: z.coerce.number().int().min(1).max(60).default(10), learningStyle: z.enum(LEARNING_STYLES).default('mixed'), scenario,
});
export const interviewInput = z.object({
  role: text(2, 100, 'Role'), level: z.enum(INTERVIEW_LEVELS).default('mid'), interviewType: z.enum(INTERVIEW_TYPES).default('mixed'),
  numQuestions: z.coerce.number().int().min(3).max(10).default(5), resumeText: optText(15000), scenario,
});
export const answerInput = z.object({ question: text(10, 600, 'Question'), answer: text(50, 4000, 'Answer'), role: optText(100), reportId: z.string().uuid().optional() });
export const profileInput = z.object({
  targetRole: z.string().trim().max(100).default(''), experienceLevel: z.enum(LEVELS).default('mid'),
  skills: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
});

// ------------------------------------------------------------------ AI output schemas
// Deliberately free of min/max/format keywords: OpenAI strict structured outputs support only a subset of JSON Schema.
// Ranges are enforced afterwards by normalize().
const importance = z.enum(['critical', 'important', 'nice-to-have']);
const category = z.enum(['behavioral', 'technical', 'system-design', 'situational', 'culture']);
const resType = z.enum(['course', 'book', 'docs', 'practice', 'community', 'project']);

export const resumeOutput = z.object({
  overallScore: z.number(), summary: z.string(),
  sectionScores: z.array(z.object({ name: z.string(), score: z.number(), comment: z.string() })),
  strengths: z.array(z.string()),
  improvements: z.array(z.object({ issue: z.string(), whyItMatters: z.string(), suggestion: z.string(), exampleRewrite: z.string() })),
  missingKeywords: z.array(z.string()), rewrittenSummary: z.string(),
});
export const skillGapOutput = z.object({
  targetRole: z.string(), matchPercent: z.number(), summary: z.string(), matchedSkills: z.array(z.string()), transferableSkills: z.array(z.string()),
  gaps: z.array(z.object({ skill: z.string(), importance, whyItMatters: z.string(), howToLearn: z.string(), estimatedHours: z.number() })), nextSteps: z.array(z.string()),
});
export const roadmapOutput = z.object({
  targetRole: z.string(), totalWeeks: z.number(), summary: z.string(),
  phases: z.array(z.object({
    title: z.string(), weeks: z.number(), goals: z.array(z.string()), skills: z.array(z.string()), activities: z.array(z.string()),
    resources: z.array(z.object({ title: z.string(), type: resType, searchHint: z.string() })), milestone: z.string(), project: z.string(),
  })),
  firstWeekActions: z.array(z.string()), risks: z.array(z.string()),
});
export const interviewOutput = z.object({
  role: z.string(), level: z.string(), interviewType: z.string(),
  questions: z.array(z.object({ question: z.string(), category, whyAsked: z.string(), strongAnswerIncludes: z.array(z.string()), answerOutline: z.string() })),
  tips: z.array(z.string()),
});
export const answerOutput = z.object({
  score: z.number(), verdict: z.string(), strengths: z.array(z.string()), improvements: z.array(z.string()),
  starCoverage: z.object({ situation: z.boolean(), task: z.boolean(), action: z.boolean(), result: z.boolean() }), improvedAnswer: z.string(),
});

export const WORKFLOWS = {
  resume: { input: resumeInput, output: resumeOutput, type: 'resume' },
  skill_gap: { input: skillGapInput, output: skillGapOutput, type: 'skill_gap' },
  roadmap: { input: roadmapInput, output: roadmapOutput, type: 'roadmap' },
  interview: { input: interviewInput, output: interviewOutput, type: 'interview' },
  answer_feedback: { input: answerInput, output: answerOutput, type: 'answer_feedback' },
};
export const REPORT_TYPES = Object.keys(WORKFLOWS);

/** Clamp numbers, dedupe/trim arrays: the last line of defence against odd model output. */
export function normalize(kind, o) {
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? Math.round(n) : lo));
  const uniq = (a) => [...new Set((a || []).map((s) => String(s).trim()).filter(Boolean))];
  const out = JSON.parse(JSON.stringify(o));
  if (kind === 'resume') { out.overallScore = clamp(out.overallScore, 0, 100); out.sectionScores.forEach((s) => { s.score = clamp(s.score, 0, 100); }); out.strengths = uniq(out.strengths); out.missingKeywords = uniq(out.missingKeywords).slice(0, 25); }
  if (kind === 'skill_gap') { out.matchPercent = clamp(out.matchPercent, 0, 100); out.matchedSkills = uniq(out.matchedSkills); out.transferableSkills = uniq(out.transferableSkills); out.gaps.forEach((g) => { g.estimatedHours = clamp(g.estimatedHours, 1, 1000); }); }
  if (kind === 'roadmap') { out.totalWeeks = clamp(out.totalWeeks, 1, 160); out.phases.forEach((p) => { p.weeks = clamp(p.weeks, 1, 160); }); }
  if (kind === 'answer_feedback') out.score = clamp(out.score, 0, 100);
  return out;
}
