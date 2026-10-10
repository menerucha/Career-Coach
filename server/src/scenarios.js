/** Preset user situations. `context` is injected into AI prompts; `defaults` pre-fill the forms. */
export const SCENARIOS = [
  { id: 'new-grad', label: 'Student / new graduate', description: 'Little or no professional experience; building a first resume and portfolio.',
    context: 'The user is a student or recent graduate with limited professional experience. Emphasise projects, coursework, internships and potential over tenure.', defaults: { experienceLevel: 'entry', level: 'junior', timeframeMonths: 6, hoursPerWeek: 12 } },
  { id: 'career-changer', label: 'Career changer', description: 'Moving into a new field from a different background.',
    context: 'The user is changing careers. Highlight transferable skills, translate prior experience into the new field\'s language, and be realistic about the learning curve.', defaults: { experienceLevel: 'entry', level: 'junior', timeframeMonths: 9, hoursPerWeek: 10 } },
  { id: 'experienced-growth', label: 'Experienced professional', description: 'Growing within the same field toward senior roles.',
    context: 'The user is an experienced professional growing in their current field. Focus on depth, scope, impact and measurable outcomes rather than basics.', defaults: { experienceLevel: 'senior', level: 'senior', timeframeMonths: 6, hoursPerWeek: 6 } },
  { id: 'return-to-work', label: 'Returning after a career break', description: 'Re-entering the workforce after time away.',
    context: 'The user is returning to work after a career break. Address skill refresh needs, how to present the gap honestly and confidently, and rebuilding recent evidence of skills.', defaults: { experienceLevel: 'mid', level: 'mid', timeframeMonths: 4, hoursPerWeek: 10 } },
  { id: 'leadership-transition', label: 'Moving into leadership', description: 'Stepping from individual contributor to manager or lead.',
    context: 'The user is moving from individual contributor to a leadership role. Focus on people management, influence, prioritisation, communication and showing team-level impact.', defaults: { experienceLevel: 'senior', level: 'lead', timeframeMonths: 6, hoursPerWeek: 5 } },
  { id: 'industry-switch', label: 'Switching industries', description: 'Same function, different industry.',
    context: 'The user is staying in the same function but moving to a different industry. Focus on domain knowledge gaps, industry vocabulary, regulations and how to reposition existing achievements.', defaults: { experienceLevel: 'mid', level: 'mid', timeframeMonths: 4, hoursPerWeek: 8 } },
];
export const SCENARIO_IDS = SCENARIOS.map((s) => s.id);
export const getScenario = (id) => SCENARIOS.find((s) => s.id === id) || null;
