import { invitationService } from './invitation.service';
import { sendSuccess } from '../../utils/response';

import type {
  CreateInvitationDto,
  CreateInvitationParams,
  RespondToInvitationParams,
} from './invitation.types';
import type { Request, Response } from 'express';

export const listPendingInvitations = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const invitations = await invitationService.listPendingInvitations(request.authUser!.userId);

  sendSuccess(response, 200, invitations);
};

export const createInvitation = async (
  request: Request<CreateInvitationParams, Record<string, never>, CreateInvitationDto>,
  response: Response,
): Promise<void> => {
  const invitation = await invitationService.inviteToWhiteboard(
    request.params.id,
    request.authUser!.userId,
    request.body,
  );

  sendSuccess(response, 201, invitation);
};

export const acceptInvitation = async (
  request: Request<RespondToInvitationParams>,
  response: Response,
): Promise<void> => {
  const invitation = await invitationService.acceptInvitation(
    request.params.invitationId,
    request.authUser!.userId,
  );

  sendSuccess(response, 200, invitation);
};

export const declineInvitation = async (
  request: Request<RespondToInvitationParams>,
  response: Response,
): Promise<void> => {
  const invitation = await invitationService.declineInvitation(
    request.params.invitationId,
    request.authUser!.userId,
  );

  sendSuccess(response, 200, invitation);
};
