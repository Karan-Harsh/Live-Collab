import createHttpError from 'http-errors';

import { invitationRepository } from './invitation.repository';
import { userService } from '../user/user.service';
import { whiteboardRepository } from '../whiteboard/whiteboard.repository';
import { whiteboardService } from '../whiteboard/whiteboard.service';

import type { CreateInvitationDto } from './invitation.types';

class InvitationService {
  async listPendingInvitations(requesterId: string) {
    return invitationRepository.listPendingForRecipient(requesterId);
  }

  async inviteToWhiteboard(
    whiteboardId: string,
    requesterId: string,
    input: CreateInvitationDto,
  ) {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (!whiteboardService.isWhiteboardOwner(whiteboard, requesterId)) {
      throw createHttpError(403, 'Only the whiteboard owner can invite collaborators.');
    }

    const recipient = await userService.getUserByEmail(input.email);

    if (recipient.id === requesterId) {
      throw createHttpError(400, 'You are already the owner of this whiteboard.');
    }

    if (whiteboardService.hasCollaborator(whiteboard, recipient.id)) {
      throw createHttpError(409, 'That user is already a collaborator on this whiteboard.');
    }

    return invitationRepository.upsertInvitation(whiteboardId, requesterId, recipient.id);
  }

  async acceptInvitation(invitationId: string, requesterId: string) {
    const invitation = await invitationRepository.findById(invitationId);

    if (!invitation || invitation.recipientId !== requesterId) {
      throw createHttpError(404, 'Invitation not found.');
    }

    if (invitation.status !== 'PENDING') {
      throw createHttpError(409, 'This invitation has already been processed.');
    }

    return invitationRepository.respondToInvitation(invitationId, requesterId, 'ACCEPTED');
  }

  async declineInvitation(invitationId: string, requesterId: string) {
    const invitation = await invitationRepository.findById(invitationId);

    if (!invitation || invitation.recipientId !== requesterId) {
      throw createHttpError(404, 'Invitation not found.');
    }

    if (invitation.status !== 'PENDING') {
      throw createHttpError(409, 'This invitation has already been processed.');
    }

    return invitationRepository.respondToInvitation(invitationId, requesterId, 'DECLINED');
  }
}

export const invitationService = new InvitationService();
