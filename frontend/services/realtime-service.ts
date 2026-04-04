'use client';

import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/lib/config';

import type {
  RealtimeCursorPresenceClearedPayload,
  RealtimeCursorPresencePayload,
  RealtimeJoinResponse,
  RealtimePresenceUpdatedPayload,
  RealtimeReceiveChangesPayload,
} from '@/lib/types';

type RealtimeError = {
  message: string;
};

type SendChangesPayload = {
  whiteboardId: string;
  changes: unknown;
  title?: string;
  content?: string;
};

type UpdateCursorPayload = {
  whiteboardId: string;
  cursor: {
    x: number;
    y: number;
  } | null;
};

type ServerToClientEvents = {
  receive_changes: (payload: RealtimeReceiveChangesPayload) => void;
  presence_updated: (payload: RealtimePresenceUpdatedPayload) => void;
  cursor_presence_updated: (payload: RealtimeCursorPresencePayload) => void;
  cursor_presence_cleared: (payload: RealtimeCursorPresenceClearedPayload) => void;
};

type ClientToServerEvents = {
  join_whiteboard: (
    payload: { whiteboardId: string },
    callback?: (response: RealtimeJoinResponse | RealtimeError) => void,
  ) => void;
  leave_whiteboard: (
    payload: { whiteboardId: string },
    callback?: (response: { left: true; whiteboardId: string } | RealtimeError) => void,
  ) => void;
  send_changes: (
    payload: SendChangesPayload,
    callback?: (response: { queued: true; whiteboardId: string } | RealtimeError) => void,
  ) => void;
  update_cursor: (payload: UpdateCursorPayload) => void;
};

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RealtimeSocket | null = null;

export const getRealtimeSocket = (token: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token,
      },
      transports: ['websocket'],
    });
  }

  socket.auth = {
    token,
  };

  return socket;
};

export const disconnectRealtimeSocket = (): void => {
  if (socket) {
    socket.disconnect();
  }
};
