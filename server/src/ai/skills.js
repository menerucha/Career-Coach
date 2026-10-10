/** Skills taxonomy used by the offline engine. Skill names are canonical lowercase. */
export const ROLES = {
  'frontend developer': { aliases: ['front end developer', 'frontend engineer', 'front-end developer', 'ui developer', 'react developer', 'web developer'], core: ['html', 'css', 'javascript', 'typescript', 'react', 'git', 'rest apis', 'testing', 'accessibility', 'responsive design'], nice: ['next.js', 'graphql', 'web performance', 'ci/cd', 'design systems'] },
  'backend developer': { aliases: ['backend engineer', 'back end developer', 'api developer', 'server-side developer'], core: ['python', 'node.js', 'sql', 'rest apis', 'databases', 'git', 'testing', 'authentication', 'docker', 'system design'], nice: ['kubernetes', 'caching', 'message queues', 'graphql', 'cloud platforms'] },
  'full stack developer': { aliases: ['full-stack developer', 'fullstack engineer', 'full stack engineer'], core: ['javascript', 'typescript', 'react', 'node.js', 'sql', 'rest apis', 'git', 'testing', 'docker', 'authentication'], nice: ['cloud platforms', 'ci/cd', 'graphql', 'system design'] },
  'data analyst': { aliases: ['business analyst', 'analytics analyst', 'bi analyst', 'reporting analyst'], core: ['sql', 'excel', 'data visualization', 'statistics', 'python', 'data cleaning', 'tableau', 'communication'], nice: ['power bi', 'a/b testing', 'dbt', 'machine learning'] },
  'data scientist': { aliases: ['applied scientist', 'research scientist'], core: ['python', 'statistics', 'machine learning', 'sql', 'pandas', 'data visualization', 'experiment design', 'communication'], nice: ['deep learning', 'spark', 'mlops', 'cloud platforms', 'nlp'] },
  'machine learning engineer': { aliases: ['ml engineer', 'ai engineer'], core: ['python', 'machine learning', 'deep learning', 'pytorch', 'sql', 'docker', 'mlops', 'git'], nice: ['kubernetes', 'spark', 'cloud platforms', 'model monitoring'] },
  'devops engineer': { aliases: ['site reliability engineer', 'sre', 'platform engineer', 'cloud engineer'], core: ['linux', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'cloud platforms', 'monitoring', 'git', 'scripting', 'networking'], nice: ['security', 'cost optimization', 'service mesh'] },
  'product manager': { aliases: ['product owner', 'associate product manager', 'apm'], core: ['product strategy', 'roadmapping', 'user research', 'prioritization', 'stakeholder management', 'data analysis', 'communication', 'agile'], nice: ['sql', 'a/b testing', 'go-to-market', 'pricing'] },
  'ux designer': { aliases: ['ui/ux designer', 'product designer', 'ux researcher', 'ui designer'], core: ['user research', 'wireframing', 'prototyping', 'figma', 'interaction design', 'usability testing', 'accessibility', 'design systems'], nice: ['motion design', 'html', 'data-informed design'] },
  'digital marketing manager': { aliases: ['marketing manager', 'growth marketer', 'performance marketer'], core: ['seo', 'content marketing', 'paid advertising', 'google analytics', 'email marketing', 'social media marketing', 'copywriting', 'campaign management'], nice: ['marketing automation', 'a/b testing', 'crm', 'data analysis'] },
  'project manager': { aliases: ['program manager', 'scrum master', 'delivery manager'], core: ['project planning', 'risk management', 'stakeholder management', 'agile', 'budgeting', 'communication', 'scheduling', 'jira'], nice: ['pmp certification', 'change management', 'data analysis'] },
  'cybersecurity analyst': { aliases: ['security analyst', 'information security analyst', 'soc analyst'], core: ['networking', 'linux', 'siem', 'incident response', 'vulnerability management', 'security fundamentals', 'scripting', 'risk assessment'], nice: ['cloud security', 'penetration testing', 'compliance', 'threat intelligence'] },
  'software engineer': { aliases: ['software developer', 'swe', 'programmer'], core: ['data structures', 'algorithms', 'git', 'testing', 'sql', 'system design', 'debugging', 'rest apis'], nice: ['docker', 'cloud platforms', 'ci/cd', 'code review'] },
};
const GENERIC = { core: ['communication', 'problem solving', 'project management', 'data analysis', 'collaboration'], nice: [] };

export const SKILL_ALIASES = { js: 'javascript', reactjs: 'react', 'react.js': 'react', ts: 'typescript', node: 'node.js', nodejs: 'node.js', postgres: 'sql', postgresql: 'sql', mysql: 'sql', 'rest api': 'rest apis', 'restful apis': 'rest apis', k8s: 'kubernetes', ml: 'machine learning', powerbi: 'power bi', aws: 'cloud platforms', gcp: 'cloud platforms', azure: 'cloud platforms', 'ab testing': 'a/b testing', 'a/b test': 'a/b testing', 'html5': 'html', 'css3': 'css', 'ci cd': 'ci/cd', cicd: 'ci/cd', 'dl': 'deep learning', 'google analytics 4': 'google analytics', ga4: 'google analytics', 'stakeholder communication': 'stakeholder management' };

export const normSkill = (s) => { const k = String(s).toLowerCase().trim().replace(/\s+/g, ' '); return SKILL_ALIASES[k] || k; };

const LEARN = {
  javascript: ['Work through a modern JavaScript course, then rebuild 3 small apps (todo list, weather widget, quiz) without frameworks.', 60],
  typescript: ['Convert one of your JavaScript projects to TypeScript and learn generics, unions and strict mode.', 25],
  react: ['Build a multi-page app with hooks, routing and data fetching; read the official docs tutorial first.', 50],
  html: ['Learn semantic HTML and forms; clone a simple landing page.', 15], css: ['Practise flexbox and grid by recreating 3 real layouts.', 25],
  sql: ['Practise joins, aggregations and window functions on a public dataset; solve 40+ query exercises.', 35],
  python: ['Take a beginner course, then automate a real task with scripts and write tests with pytest.', 50],
  git: ['Learn branching, rebasing and pull requests by contributing to a small open-source repo.', 10],
  'rest apis': ['Design and build a small CRUD API with authentication; document it with OpenAPI.', 20],
  testing: ['Add unit and integration tests to an existing project; learn test-driven development basics.', 20],
  docker: ['Containerise one of your apps and run it with docker compose alongside a database.', 15],
  kubernetes: ['Deploy a sample app to a local cluster (kind/minikube); learn pods, services and deployments.', 40],
  statistics: ['Cover descriptive statistics, distributions, hypothesis testing and regression with worked examples.', 50],
  'machine learning': ['Complete an applied ML course and build 2 end-to-end projects with proper evaluation.', 80],
  'data visualization': ['Create dashboards from a real dataset and learn chart-choice principles.', 25],
  excel: ['Master pivot tables, lookups and conditional formatting on real spreadsheets.', 20], tableau: ['Build 3 public dashboards and publish them to a portfolio.', 25],
  'user research': ['Run 5 user interviews and synthesise them into insights; learn interview scripting.', 30], figma: ['Recreate 3 apps in Figma using components and auto layout.', 25],
  seo: ['Audit a real site and implement on-page and technical SEO fixes.', 30], 'system design': ['Study core building blocks (caching, queues, sharding) and practise 10 design problems out loud.', 50],
  'ci/cd': ['Set up a pipeline that tests, builds and deploys one of your projects automatically.', 15], terraform: ['Provision a small cloud environment as code and tear it down again.', 25],
  'data structures': ['Implement core structures from scratch and solve 60+ practice problems.', 60], algorithms: ['Study sorting, searching, graphs and dynamic programming with timed practice.', 60],
  agile: ['Learn Scrum/Kanban practice and run a small project with sprints and retros.', 12], roadmapping: ['Write a 3-month roadmap for a real product and defend the prioritisation.', 15],
  prioritization: ['Practise RICE/MoSCoW scoring on real backlogs.', 10], communication: ['Practise writing concise status updates and presenting to non-experts.', 15],
  'stakeholder management': ['Map stakeholders on a real project and practise setting expectations in writing.', 15], accessibility: ['Learn WCAG basics and audit a site with screen-reader and keyboard testing.', 15],
};
export const learnHint = (skill) => { const h = LEARN[skill]; return h ? { how: h[0], hours: h[1] } : { how: `Take an introductory course in ${skill}, then apply it in a small project and get feedback from someone experienced.`, hours: 25 }; };

const CANON = new Set();
Object.values(ROLES).forEach((r) => [...r.core, ...r.nice].forEach((s) => CANON.add(s)));
Object.keys(LEARN).forEach((s) => CANON.add(s));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const SCAN = [...CANON.keys()].map((s) => [s, new RegExp(`(^|[^a-z0-9+#.])${esc(s)}($|[^a-z0-9+#])`, 'i')])
  .concat(Object.entries(SKILL_ALIASES).map(([a, c]) => [c, new RegExp(`(^|[^a-z0-9+#.])${esc(a)}($|[^a-z0-9+#])`, 'i')]));

/** Canonical skills mentioned anywhere in free text. */
export function skillsFromText(text) {
  const found = new Set();
  for (const [skill, re] of SCAN) if (re.test(text)) found.add(skill);
  return [...found];
}

export function findRole(role) {
  const q = String(role || '').toLowerCase().trim().replace(/[^a-z0-9/ -]/g, '');
  if (!q) return null;
  for (const [k, v] of Object.entries(ROLES)) if (k === q || v.aliases.includes(q)) return k;
  const tokens = new Set(q.split(/[ -/]+/).filter((t) => t.length > 2 && !['senior', 'junior', 'lead', 'staff', 'principal', 'intern'].includes(t)));
  let best = null, bestScore = 0;
  for (const [k, v] of Object.entries(ROLES)) for (const name of [k, ...v.aliases]) {
    const nt = new Set(name.split(/[ -/]+/)); const overlap = [...tokens].filter((t) => nt.has(t)).length;
    const score = tokens.size ? overlap / Math.max(tokens.size, nt.size) : 0;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return bestScore >= 0.5 ? best : null;
}

/** Skills a role needs: from the taxonomy, else from the job description, else generic professional skills. */
export function roleSkills(role, jobDescription) {
  const key = findRole(role);
  if (key) return { key, known: true, ...ROLES[key] };
  const fromJd = jobDescription ? skillsFromText(jobDescription) : [];
  if (fromJd.length) return { key: null, known: false, core: fromJd.slice(0, 8), nice: fromJd.slice(8, 14) };
  return { key: null, known: false, ...GENERIC };
}
