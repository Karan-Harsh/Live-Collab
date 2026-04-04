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
  content: z.string().max(100_000).optional(),
});

export type JoinDocumentPayload = z.infer<typeof joinDocumentSchema>;
export type LeaveDocumentPayload = z.infer<typeof leaveDocumentSchema>;
export type SendChangesPayload = z.infer<typeof sendChangesSchema>;

export interface ReceiveChangesPayload {
  whiteboardId: string;
  changes: unknown;
  title?: string;
  content?: string;
  updatedBy: string;
  timestamp: string;
  synchronized?: boolean;
}

export interface JoinDocumentSuccessPayload {
  whiteboardId: string;
  title: string;
  content: string;
  ownerId: string;
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
}

export interface ServerToClientEvents {
  receive_changes: (payload: ReceiveChangesPayload) => void;
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
