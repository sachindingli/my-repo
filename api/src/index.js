import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const server = createApp().listen(config.port, () => {
  console.log(`Hitkram API listening on http://localhost:${config.port}`);
});

const shutdown = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
