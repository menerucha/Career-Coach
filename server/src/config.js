import 'dotenv/config';

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const bool = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

/** Runtime config from env; `overrides` is used by tests. */
export function loadConfig(overrides = {}) {
  const e = process.env;
  const cfg = {
    env: e.NODE_ENV || 'development',
    port: num(e.PORT, 4000),
    corsOrigin: e.CORS_ORIGIN || 'http://localhost:5173',
    // ---- auth
    authMode: (e.AUTH_MODE || (e.CLERK_PUBLISHABLE_KEY || e.CLERK_JWT_KEY || e.CLERK_ISSUER ? 'clerk' : 'demo')).toLowerCase(),   // clerk | demo
    clerkPublishableKey: e.CLERK_PUBLISHABLE_KEY || '',
    clerkIssuer: e.CLERK_ISSUER || '',                    // e.g. https://your-app.clerk.accounts.dev (derived from the publishable key if empty)
    clerkJwtKey: (e.CLERK_JWT_KEY || '').replace(/\\n/g, '\n'),   // optional PEM public key -> verify without any network call
    clerkAuthorizedParties: (e.CLERK_AUTHORIZED_PARTIES || '').split(',').map((s) => s.trim()).filter(Boolean),
    // ---- AI
    aiEngine: (e.AI_ENGINE || (e.OPENAI_API_KEY ? 'openai' : 'mock')).toLowerCase(),     // openai | mock
    openaiApiKey: e.OPENAI_API_KEY || '',
    openaiBaseUrl: (e.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    openaiModel: e.OPENAI_MODEL || 'gpt-4o-mini',
    openaiTimeoutMs: num(e.OPENAI_TIMEOUT_MS, 60000),
    openaiMaxAttempts: num(e.OPENAI_MAX_ATTEMPTS, 3),
    openaiRetryBaseMs: num(e.OPENAI_RETRY_BASE_MS, 600),
    // ---- storage
    supabaseUrl: e.SUPABASE_URL || '',
    supabaseServiceKey: e.SUPABASE_SERVICE_ROLE_KEY || '',
    allowMemoryStore: bool(e.ALLOW_MEMORY_STORE, false),
    // ---- limits
    dailyLimit: num(e.DAILY_LIMIT, 25),                   // AI generations per user per rolling 24h
    ratePerMinute: num(e.RATE_PER_MINUTE, 12),            // AI calls per user per minute
    apiPerMinute: num(e.API_PER_MINUTE, 240),
  };
  return { ...cfg, ...overrides };
}

/** Fail fast on dangerous or incomplete configuration. */
export function validateConfig(c) {
  const problems = [];
  const prod = c.env === 'production';
  if (c.authMode === 'demo' && prod) problems.push('AUTH_MODE=demo is not allowed in production (it accepts unauthenticated demo tokens).');
  if (c.authMode === 'clerk' && !(c.clerkJwtKey || c.clerkIssuer || c.clerkPublishableKey)) problems.push('Clerk auth needs CLERK_PUBLISHABLE_KEY (or CLERK_ISSUER / CLERK_JWT_KEY).');
  if (!['clerk', 'demo'].includes(c.authMode)) problems.push(`Unknown AUTH_MODE '${c.authMode}'.`);
  if (c.aiEngine === 'openai' && !c.openaiApiKey) problems.push('AI_ENGINE=openai needs OPENAI_API_KEY.');
  if (!['openai', 'mock'].includes(c.aiEngine)) problems.push(`Unknown AI_ENGINE '${c.aiEngine}'.`);
  if (prod && !(c.supabaseUrl && c.supabaseServiceKey) && !c.allowMemoryStore) problems.push('Production needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ALLOW_MEMORY_STORE=true).');
  if (c.supabaseUrl && !c.supabaseServiceKey) problems.push('SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing.');
  return problems;
}
