import { createAdapter } from '@socket.io/redis-adapter';
import createHttpError from 'http-errors';
import { Server } from 'socket.io';

import { registerRealtimeHandlers } from './realtime.handlers';
import { logRealtimeEvent } from './realtime.logger';
import { realtimeService } from './realtime.service';
import { allowedCorsOrigins } from '../../config/cors';
import { createRedisSocketAdapterClients } from '../../config/redis';
import { verifyAccessToken } from '../auth/auth.utils';

import type { RealtimeServer, RealtimeSocket } from './realtime.types';
import type { Server as HttpServer } from 'node:http';

const getSocketToken = (socket: RealtimeSocket): string | null => {
  const authToken = socket.handshake.auth.token;

  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }

  const authorizationHeader = socket.handshake.headers.authorization;

  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const initializeRealtimeServer = async (httpServer: HttpServer): Promise<RealtimeServer> => {
  const io: RealtimeServer = new Server(httpServer, {
    cors: {
      origin: allowedCorsOrigins,
      credentials: true,
    },
  });

  const { publisher, subscriber } = await createRedisSocketAdapterClients();
  io.adapter(createAdapter(publisher, subscriber));

  io.use((socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        throw createHttpError(401, 'Socket authentication token is required.');
      }

      const payload = verifyAccessToken(token);

      socket.data.authUser = {
        userId: payload.sub,
        email: payload.email,
      };

      next();
    } catch (error) {
      next(error instanceof Error ? error : createHttpError(401, 'Invalid socket authentication.'));
    }
  });

  io.on('connection', (socket) => {
    logRealtimeEvent('Socket connected.', {
      socketId: socket.id,
      userId: socket.data.authUser.userId,
      transport: socket.conn.transport.name,
    });

    registerRealtimeHandlers(io, socket);
  });

  io.engine.on('connection_error', (error) => {
    console.error('Realtime connection error:', error);
  });

  return io;
};

export const shutdownRealtimeServer = async (io?: RealtimeServer): Promise<void> => {
  await realtimeService.shutdown();

  if (io) {
    io.disconnectSockets(true);
    await new Promise<void>((resolve) => {
      void io.close(() => {
        resolve();
      });
    });
  }
};
