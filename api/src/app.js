import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { ah, errorHandler } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import { catalog } from './routes/catalog.js';
import { checkout, razorpayWebhook } from './routes/checkout.js';
import { admin, UPLOAD_DIR } from './routes/admin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cors({ origin: config.webOrigin }));

  // Webhook signature is computed over the raw body, so it must be read before express.json().
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), ah(razorpayWebhook));

  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, fallthrough: false }));

  app.get(
    '/api/health',
    ah(async (req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    }),
  );
  app.use('/api', catalog);
  app.use('/api', checkout);
  app.use('/api/admin', admin);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
