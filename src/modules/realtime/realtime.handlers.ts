import { ZodError } from 'zod';

import { logRealtimeEvent } from './realtime.logger';
import { realtimeService } from './realtime.service';
import { joinDocumentSchema, leaveDocumentSchema, sendChangesSchema } from './realtime.types';

import type { RealtimeServer, RealtimeSocket } from './realtime.types';

const getRoomName = (documentId: string): string => {
  return `document:${documentId}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(', ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected realtime error.';
};

export const registerRealtimeHandlers = (_io: RealtimeServer, socket: RealtimeSocket): void => {
  socket.on('join_document', async (payload, callback) => {
    try {
      const parsedPayload = joinDocumentSchema.parse(payload);
      const document = await realtimeService.getJoinState(
        parsedPayload.documentId,
        socket.data.authUser.userId,
      );

      await socket.join(getRoomName(parsedPayload.documentId));
      realtimeService.trackSocketDocument(socket.id, parsedPayload.documentId);

      logRealtimeEvent('Socket joined document room.', {
        socketId: socket.id,
        documentId: parsedPayload.documentId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        documentId: document.id,
        title: document.title,
        content: document.content,
        isShared: document.isShared,
        ownerId: document.ownerId,
      });
    } catch (error) {
      callback?.({
        message: getErrorMessage(error),
      });
    }
  });

  socket.on('leave_document', async (payload, callback) => {
    try {
      const parsedPayload = leaveDocumentSchema.parse(payload);

      await socket.leave(getRoomName(parsedPayload.documentId));
      realtimeService.untrackSocketDocument(socket.id, parsedPayload.documentId);

      logRealtimeEvent('Socket left document room.', {
        socketId: socket.id,
        documentId: parsedPayload.documentId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        left: true,
        documentId: parsedPayload.documentId,
      });
    } catch (error) {
      callback?.({
        message: getErrorMessage(error),
      });
    }
  });

  socket.on('send_changes', async (payload, callback) => {
    try {
      const parsedPayload = sendChangesSchema.parse(payload);

      await realtimeService.stageDocumentChange(socket.data.authUser.userId, parsedPayload);

      const receiveChangesPayload = {
        documentId: parsedPayload.documentId,
        changes: parsedPayload.changes,
        updatedBy: socket.data.authUser.userId,
        timestamp: new Date().toISOString(),
        ...(parsedPayload.title !== undefined ? { title: parsedPayload.title } : {}),
        ...(parsedPayload.content !== undefined ? { content: parsedPayload.content } : {}),
      };

      socket.to(getRoomName(parsedPayload.documentId)).emit('receive_changes', receiveChangesPayload);

      logRealtimeEvent('Broadcasted document changes.', {
        socketId: socket.id,
        documentId: parsedPayload.documentId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        queued: true,
        documentId: parsedPayload.documentId,
      });
    } catch (error) {
      callback?.({
        message: getErrorMessage(error),
      });
    }
  });

  socket.on('disconnect', (reason) => {
    const documentIds = realtimeService.handleDisconnect(socket.id);

    logRealtimeEvent('Socket disconnected.', {
      socketId: socket.id,
      userId: socket.data.authUser.userId,
      reason,
      documentIds,
    });
  });
};
