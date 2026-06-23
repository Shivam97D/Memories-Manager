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
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
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
