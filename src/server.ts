import { createServer } from 'node:http';

import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { disconnectRedis } from './config/redis';
import {
  initializeRealtimeServer,
  shutdownRealtimeServer,
} from './modules/realtime/realtime.server';

import type { RealtimeServer } from './modules/realtime/realtime.types';

const server = createServer(app);
let realtimeServer: RealtimeServer | undefined;

const shutdown = async (signal: string): Promise<void> => {
  console.info(`${signal} received. Starting graceful shutdown.`);

  server.close((error?: Error) => {
    void (async () => {
      if (error) {
        console.error('Error while closing the HTTP server.', error);
      }

      await Promise.allSettled([
        shutdownRealtimeServer(realtimeServer),
        prisma.$disconnect(),
        disconnectRedis(),
      ]);
      process.exit(error ? 1 : 0);
    })();
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
};

const bootstrap = async (): Promise<void> => {
  realtimeServer = await initializeRealtimeServer(server);

  server.listen(env.PORT, () => {
    console.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
  });
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to bootstrap server.', error);
  process.exit(1);
});
