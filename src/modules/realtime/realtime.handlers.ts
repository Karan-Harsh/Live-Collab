import { ZodError } from 'zod';

import { logRealtimeEvent } from './realtime.logger';
import { realtimeService } from './realtime.service';
import { joinDocumentSchema, leaveDocumentSchema, sendChangesSchema } from './realtime.types';
import { whiteboardService } from '../whiteboard/whiteboard.service';

import type { RealtimeServer, RealtimeSocket } from './realtime.types';

const getRoomName = (whiteboardId: string): string => {
  return `whiteboard:${whiteboardId}`;
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
  socket.on('join_whiteboard', async (payload, callback) => {
    try {
      const parsedPayload = joinDocumentSchema.parse(payload);
      const whiteboard = await realtimeService.getJoinState(
        parsedPayload.whiteboardId,
        socket.data.authUser.userId,
      );

      await socket.join(getRoomName(parsedPayload.whiteboardId));
      const activeUserIds = realtimeService.trackSocketWhiteboard(
        socket.id,
        parsedPayload.whiteboardId,
        socket.data.authUser.userId,
      );

      socket.to(getRoomName(parsedPayload.whiteboardId)).emit('presence_updated', {
        whiteboardId: parsedPayload.whiteboardId,
        activeUserIds,
        joinedUserId: socket.data.authUser.userId,
        timestamp: new Date().toISOString(),
      });

      logRealtimeEvent('Socket joined whiteboard room.', {
        socketId: socket.id,
        whiteboardId: parsedPayload.whiteboardId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        whiteboardId: whiteboard.id,
        title: whiteboard.title,
        content: whiteboard.content,
        ownerId: whiteboard.ownerId,
        activeUserIds,
        accessRole: whiteboardService.isWhiteboardOwner(whiteboard, socket.data.authUser.userId)
          ? 'owner'
          : 'collaborator',
        permissions: {
          canEdit: whiteboardService.canEditWhiteboard(whiteboard, socket.data.authUser.userId),
          canDelete: whiteboardService.isWhiteboardOwner(
            whiteboard,
            socket.data.authUser.userId,
          ),
          canInvite: whiteboardService.isWhiteboardOwner(
            whiteboard,
            socket.data.authUser.userId,
          ),
          canManageAccess: whiteboardService.isWhiteboardOwner(
            whiteboard,
            socket.data.authUser.userId,
          ),
        },
      });
    } catch (error) {
      callback?.({
        message: getErrorMessage(error),
      });
    }
  });

  socket.on('leave_whiteboard', async (payload, callback) => {
    try {
      const parsedPayload = leaveDocumentSchema.parse(payload);

      await socket.leave(getRoomName(parsedPayload.whiteboardId));
      const activeUserIds = realtimeService.untrackSocketWhiteboard(
        socket.id,
        parsedPayload.whiteboardId,
        socket.data.authUser.userId,
      );

      socket.to(getRoomName(parsedPayload.whiteboardId)).emit('presence_updated', {
        whiteboardId: parsedPayload.whiteboardId,
        activeUserIds,
        leftUserId: socket.data.authUser.userId,
        timestamp: new Date().toISOString(),
      });

      logRealtimeEvent('Socket left whiteboard room.', {
        socketId: socket.id,
        whiteboardId: parsedPayload.whiteboardId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        left: true,
        whiteboardId: parsedPayload.whiteboardId,
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

      await realtimeService.stageWhiteboardChange(socket.data.authUser.userId, parsedPayload);

      const receiveChangesPayload = {
        whiteboardId: parsedPayload.whiteboardId,
        changes: parsedPayload.changes,
        updatedBy: socket.data.authUser.userId,
        timestamp: new Date().toISOString(),
        ...(parsedPayload.title !== undefined ? { title: parsedPayload.title } : {}),
        ...(parsedPayload.content !== undefined ? { content: parsedPayload.content } : {}),
      };

      socket.to(getRoomName(parsedPayload.whiteboardId)).emit('receive_changes', receiveChangesPayload);

      logRealtimeEvent('Broadcasted whiteboard changes.', {
        socketId: socket.id,
        whiteboardId: parsedPayload.whiteboardId,
        userId: socket.data.authUser.userId,
      });

      callback?.({
        queued: true,
        whiteboardId: parsedPayload.whiteboardId,
      });
    } catch (error) {
      callback?.({
        message: getErrorMessage(error),
      });
    }
  });

  socket.on('disconnect', (reason) => {
    const disconnectState = realtimeService.handleDisconnect(
      socket.id,
      socket.data.authUser.userId,
    );

    for (const state of disconnectState) {
      socket.to(getRoomName(state.whiteboardId)).emit('presence_updated', {
        whiteboardId: state.whiteboardId,
        activeUserIds: state.activeUserIds,
        leftUserId: socket.data.authUser.userId,
        timestamp: new Date().toISOString(),
      });
    }

    logRealtimeEvent('Socket disconnected.', {
      socketId: socket.id,
      userId: socket.data.authUser.userId,
      reason,
      whiteboardIds: disconnectState.map((state) => state.whiteboardId),
    });
  });
};
