export class AppError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export const badRequest = (m, d) => new AppError(400, 'BAD_REQUEST', m, d);
export const unauthenticated = (m = 'Sign in required') => new AppError(401, 'UNAUTHENTICATED', m);
export const notFound = (m = 'Not found') => new AppError(404, 'NOT_FOUND', m);
/** The AI engine failed or returned something unusable. Safe message only; details stay in server logs. */
export class AIError extends AppError {
  constructor(message, { status = 502, code = 'AI_UNAVAILABLE', cause } = {}) { super(status, code, message); this.cause = cause; }
}
