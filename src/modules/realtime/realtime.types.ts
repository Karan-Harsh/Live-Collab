import { z } from 'zod';

import type { AuthenticatedRequestUser } from '../auth/auth.types';
import type { Server, Socket } from 'socket.io';

export const joinDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export const leaveDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export const sendChangesSchema = z.object({
  documentId: z.string().uuid(),
  changes: z.unknown(),
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().max(100_000).optional(),
});

export type JoinDocumentPayload = z.infer<typeof joinDocumentSchema>;
export type LeaveDocumentPayload = z.infer<typeof leaveDocumentSchema>;
export type SendChangesPayload = z.infer<typeof sendChangesSchema>;

export interface ReceiveChangesPayload {
  documentId: string;
  changes: unknown;
  title?: string;
  content?: string;
  updatedBy: string;
  timestamp: string;
  synchronized?: boolean;
}

export interface JoinDocumentSuccessPayload {
  documentId: string;
  title: string;
  content: string;
  isShared: boolean;
  ownerId: string;
}

export interface RealtimeErrorPayload {
  message: string;
}

export interface ClientToServerEvents {
  join_document: (
    payload: JoinDocumentPayload,
    callback?: (response: JoinDocumentSuccessPayload | RealtimeErrorPayload) => void,
  ) => void;
  leave_document: (
    payload: LeaveDocumentPayload,
    callback?: (response: { left: true; documentId: string } | RealtimeErrorPayload) => void,
  ) => void;
  send_changes: (
    payload: SendChangesPayload,
    callback?: (response: { queued: true; documentId: string } | RealtimeErrorPayload) => void,
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
