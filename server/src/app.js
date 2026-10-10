import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { buildRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/common.js';
import { createAuthMiddleware } from './middleware/auth.js';

export async function createApp({ cfg, store, engine, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: cfg.corsOrigin === '*' ? true : cfg.corsOrigin.split(',').map((s) => s.trim()), allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 600 }));
  app.use(express.json({ limit: '100kb' }));
  const requireAuth = await createAuthMiddleware(cfg, logger);
  app.use('/api', buildRouter({ cfg, store, engine, requireAuth }));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
