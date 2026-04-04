'use client';

import { apiRequest } from './api-client';

import type { WhiteboardInvitationRecord } from '@/lib/types';

export const listInvitations = async (): Promise<WhiteboardInvitationRecord[]> => {
  return apiRequest<WhiteboardInvitationRecord[]>('/invitations');
};

export const createInvitation = async (
  whiteboardId: string,
  email: string,
): Promise<WhiteboardInvitationRecord> => {
  return apiRequest<WhiteboardInvitationRecord>(`/invitations/whiteboards/${whiteboardId}`, {
    method: 'POST',
    body: JSON.stringify({
      email,
    }),
  });
};

export const acceptInvitation = async (
  invitationId: string,
): Promise<WhiteboardInvitationRecord> => {
  return apiRequest<WhiteboardInvitationRecord>(`/invitations/${invitationId}/accept`, {
    method: 'POST',
  });
};

export const declineInvitation = async (
  invitationId: string,
): Promise<WhiteboardInvitationRecord> => {
  return apiRequest<WhiteboardInvitationRecord>(`/invitations/${invitationId}/decline`, {
    method: 'POST',
  });
};
