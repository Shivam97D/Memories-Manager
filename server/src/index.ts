import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db';
import { env } from './config/env';

import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import storageRoutes from './routes/storage';
import sharesRoutes from './routes/shares';
import proxyRoutes from './routes/proxy';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.use(helmet());

// Build allowed origins from CLIENT_URL env var (supports comma-separated list)
const allowedOrigins = [
  ...env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Render health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// Auth rate limit (stricter)
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/proxy', proxyRoutes);

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`PixelVault API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

bootstrap();

export default app;
