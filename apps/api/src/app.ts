import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig, type ApiConfig } from './config/env.js';
import { connectDb, dbStatus } from './config/db.js';
import { createAuthorize, type Fetcher } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import petsRoute from './routes/v1/pets.route.js';
import plansRoute from './routes/v1/meal-plans.route.js';
import observationsRoute from './routes/v1/nutrition-observations.route.js';
import exportRoute from './routes/v1/export.route.js';
import foodsRoute from './routes/v1/foods.route.js';
import progressRoute from './routes/v1/progress.route.js';
import { AppError } from './utils/AppError.js';

export function createApp(options: { config?: ApiConfig; fetcher?: Fetcher } = {}) {
  const config = options.config ?? loadConfig();
  const app = express();
  const origins = config.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: () => config.NODE_ENV === 'test',
    }),
  );
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', db: dbStatus(), uptime: Math.floor(process.uptime()) });
  });
  app.use('/api/v1', createAuthorize(config, options.fetcher));
  app.get('/api/v1/session', (req, res) => res.json(req.currentPrincipal));
  app.use('/api/v1', async (_req, _res, next) => {
    try {
      await connectDb(config.PLANNER_MONGODB_URI);
      next();
    } catch {
      next(new AppError(503, 'Planner storage is unavailable. Please retry.', 'db-unavailable'));
    }
  });
  app.use('/api/v1/pets', petsRoute);
  app.use('/api/v1/meal-plans', plansRoute);
  app.use('/api/v1/nutrition-observations', observationsRoute);
  app.use('/api/v1/export', exportRoute);
  app.use('/api/v1/foods', foodsRoute);
  app.use('/api/v1/progress', progressRoute);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp();
