import { createRemoteJWKSet, importSPKI, jwtVerify } from 'jose';
import { unauthenticated } from '../errors.js';

/** Frontend API host is base64-encoded inside Clerk publishable keys: pk_test_<b64("host$")>. */
export function issuerFromPublishableKey(pk) {
  const m = /^pk_(?:test|live)_(.+)$/.exec(pk || '');
  if (!m) return '';
  try { const host = Buffer.from(m[1], 'base64').toString('utf8').replace(/\$$/, ''); return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : ''; } catch { return ''; }
}

/**
 * Verifies Clerk session tokens (RS256 JWTs) on the server: signature, expiry/nbf, issuer and (optionally) authorised party.
 * Keys come from CLERK_JWT_KEY (PEM, no network) or the issuer's JWKS endpoint (cached by jose).
 */
export async function createClerkVerifier(cfg) {
  const issuer = cfg.clerkIssuer || issuerFromPublishableKey(cfg.clerkPublishableKey);
  let getKey;
  if (cfg.clerkJwtKey) { const k = await importSPKI(cfg.clerkJwtKey, 'RS256'); getKey = async () => k; }
  else if (issuer) { const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { cooldownDuration: 30_000 }); getKey = jwks; }
  else throw new Error('Cannot verify Clerk tokens: set CLERK_JWT_KEY, CLERK_ISSUER or CLERK_PUBLISHABLE_KEY');
  return async function verify(token) {
    const { payload } = await jwtVerify(token, getKey, { algorithms: ['RS256'], clockTolerance: 5, ...(issuer ? { issuer } : {}) });
    if (!payload.sub) throw new Error('token has no subject');
    if (cfg.clerkAuthorizedParties.length && payload.azp && !cfg.clerkAuthorizedParties.includes(payload.azp)) throw new Error('unauthorised party');
    return { userId: payload.sub, claims: payload };
  };
}

/** DEMO ONLY: "Bearer demo.<userId>". Refused at startup in production (see validateConfig). */
export function createDemoVerifier() {
  return async function verify(token) {
    const m = /^demo\.([A-Za-z0-9_-]{3,40})$/.exec(token);
    if (!m) throw new Error('bad demo token');
    return { userId: `demo_${m[1]}`, claims: { demo: true } };
  };
}

export async function createAuthMiddleware(cfg, logger = console) {
  const verify = cfg.authMode === 'clerk' ? await createClerkVerifier(cfg) : createDemoVerifier();
  return async function requireAuth(req, res, next) {
    const h = req.get('authorization') || '';
    const m = /^Bearer\s+(\S+)$/i.exec(h);
    if (!m) return next(unauthenticated('Missing bearer token'));
    try { const { userId } = await verify(m[1]); req.userId = userId; next(); }
    catch (e) { logger.debug?.(`[auth] rejected: ${e.code || e.message}`); next(unauthenticated('Invalid or expired session')); }
  };
}
