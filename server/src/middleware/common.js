import { ZodError } from 'zod';
import { AppError, badRequest, notFound } from '../errors.js';

/** Parse with zod, turning failures into a 400 with per-field details the UI can show next to inputs. */
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  const details = r.error.issues.map((i) => ({ field: i.path.join('.') || '(body)', message: i.message }));
  throw badRequest(details[0].message, details);
}

export const notFoundHandler = (req, res, next) => next(notFound(`Route ${req.method} ${req.path} not found`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (logger = console) => (err, req, res, next) => {
  let status = err.status || err.statusCode || 500, code = err.code, message = err.message;
  if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Malformed JSON body'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'TOO_LARGE'; message = 'Request body too large'; }
  else if (err instanceof ZodError) { status = 400; code = 'BAD_REQUEST'; }
  else if (!(err instanceof AppError) && status >= 500) { logger.error?.('[unhandled]', err); status = 500; code = 'INTERNAL_ERROR'; message = 'Internal server error'; }
  if (err.cause && status >= 500) logger.error?.(`[${code}]`, err.cause?.message || err.cause);
  res.status(status).json({ error: { code: typeof code === 'string' ? code : 'ERROR', message, ...(err.details ? { details: err.details } : {}) } });
};
