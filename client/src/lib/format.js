export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const TYPE_LABELS = { resume: 'Resume feedback', skill_gap: 'Skill gap', roadmap: 'Roadmap', interview: 'Interview prep', answer_feedback: 'Answer feedback' };
export const TYPE_PATHS = { resume: '/resume', skill_gap: '/skill-gap', roadmap: '/roadmap', interview: '/interview' };
/** Words a screen reader / user can read: "2 hours ago" style would need extra libs; keep it simple. */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
