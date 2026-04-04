'use client';

import { apiRequest } from './api-client';

import type { WhiteboardRecord } from '@/lib/types';

interface CreateWhiteboardInput {
  title: string;
  content: string;
  isShared: boolean;
}

interface UpdateWhiteboardInput {
  title?: string;
  content?: string;
  isShared?: boolean;
}

export const listWhiteboards = async (): Promise<WhiteboardRecord[]> => {
  return apiRequest<WhiteboardRecord[]>('/whiteboards');
};

export const createWhiteboard = async (
  input: CreateWhiteboardInput,
): Promise<WhiteboardRecord> => {
  return apiRequest<WhiteboardRecord>('/whiteboards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const getWhiteboard = async (whiteboardId: string): Promise<WhiteboardRecord> => {
  return apiRequest<WhiteboardRecord>(`/whiteboards/${whiteboardId}`);
};

export const updateWhiteboard = async (
  whiteboardId: string,
  input: UpdateWhiteboardInput,
): Promise<WhiteboardRecord> => {
  return apiRequest<WhiteboardRecord>(`/whiteboards/${whiteboardId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
};

export const deleteWhiteboard = async (
  whiteboardId: string,
): Promise<{ deleted: true; id: string }> => {
  return apiRequest<{ deleted: true; id: string }>(`/whiteboards/${whiteboardId}`, {
    method: 'DELETE',
  });
};
