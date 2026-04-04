'use client';

import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/lib/config';

import type { RealtimeJoinResponse, RealtimeReceiveChangesPayload } from '@/lib/types';

type RealtimeError = {
  message: string;
};

type SendChangesPayload = {
  documentId: string;
  changes: unknown;
  title?: string;
  content?: string;
};

type ServerToClientEvents = {
  receive_changes: (payload: RealtimeReceiveChangesPayload) => void;
};

type ClientToServerEvents = {
  join_document: (
    payload: { documentId: string },
    callback?: (response: RealtimeJoinResponse | RealtimeError) => void,
  ) => void;
  leave_document: (
    payload: { documentId: string },
    callback?: (response: { left: true; documentId: string } | RealtimeError) => void,
  ) => void;
  send_changes: (
    payload: SendChangesPayload,
    callback?: (response: { queued: true; documentId: string } | RealtimeError) => void,
  ) => void;
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
