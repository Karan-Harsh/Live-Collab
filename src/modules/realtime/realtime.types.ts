import { z } from 'zod';

import type { AuthenticatedRequestUser } from '../auth/auth.types';
import type { Server, Socket } from 'socket.io';

export const joinDocumentSchema = z.object({
  whiteboardId: z.string().uuid(),
});

export const leaveDocumentSchema = z.object({
  whiteboardId: z.string().uuid(),
});

export const sendChangesSchema = z.object({
  whiteboardId: z.string().uuid(),
  changes: z.unknown(),
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().max(5_000_000).optional(),
});

export const updateCursorSchema = z.object({
  whiteboardId: z.string().uuid(),
  cursor:
    z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
      })
      .nullable(),
});

export type JoinDocumentPayload = z.infer<typeof joinDocumentSchema>;
export type LeaveDocumentPayload = z.infer<typeof leaveDocumentSchema>;
export type SendChangesPayload = z.infer<typeof sendChangesSchema>;
export type UpdateCursorPayload = z.infer<typeof updateCursorSchema>;

export interface ReceiveChangesPayload {
  whiteboardId: string;
  changes: unknown;
  title?: string;
  content?: string;
  updatedBy: string;
  timestamp: string;
  synchronized?: boolean;
}

export interface PresenceUpdatedPayload {
  whiteboardId: string;
  activeUserIds: string[];
  joinedUserId?: string;
  leftUserId?: string;
  timestamp: string;
}

export interface CursorPresencePayload {
  userId: string;
  whiteboardId: string;
  cursor: {
    x: number;
    y: number;
  };
  timestamp: string;
}

export interface CursorPresenceClearedPayload {
  whiteboardId: string;
  userId: string;
  timestamp: string;
}

export interface JoinDocumentSuccessPayload {
  whiteboardId: string;
  title: string;
  content: string;
  ownerId: string;
  activeUserIds: string[];
  activeCursors: CursorPresencePayload[];
  accessRole: 'owner' | 'collaborator';
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canManageAccess: boolean;
  };
}

export interface RealtimeErrorPayload {
  message: string;
}

export interface ClientToServerEvents {
  join_whiteboard: (
    payload: JoinDocumentPayload,
    callback?: (response: JoinDocumentSuccessPayload | RealtimeErrorPayload) => void,
  ) => void;
  leave_whiteboard: (
    payload: LeaveDocumentPayload,
    callback?: (response: { left: true; whiteboardId: string } | RealtimeErrorPayload) => void,
  ) => void;
  send_changes: (
    payload: SendChangesPayload,
    callback?: (response: { queued: true; whiteboardId: string } | RealtimeErrorPayload) => void,
  ) => void;
  update_cursor: (payload: UpdateCursorPayload) => void;
}

export interface ServerToClientEvents {
  receive_changes: (payload: ReceiveChangesPayload) => void;
  presence_updated: (payload: PresenceUpdatedPayload) => void;
  cursor_presence_updated: (payload: CursorPresencePayload) => void;
  cursor_presence_cleared: (payload: CursorPresenceClearedPayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  authUser: AuthenticatedRequestUser;
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
