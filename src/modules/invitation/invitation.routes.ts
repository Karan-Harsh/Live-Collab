import { Router } from 'express';

import {
  acceptInvitation,
  createInvitation,
  declineInvitation,
  listPendingInvitations,
} from './invitation.controller';
import {
  createInvitationSchema,
  listInvitationsSchema,
  respondToInvitationSchema,
} from './invitation.types';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate-request';

export const invitationRouter = Router();

invitationRouter.use(authenticate);

invitationRouter.get('/', validateRequest(listInvitationsSchema), listPendingInvitations);
invitationRouter.post(
  '/whiteboards/:id',
  validateRequest(createInvitationSchema),
  createInvitation,
);
invitationRouter.post(
  '/:invitationId/accept',
  validateRequest(respondToInvitationSchema),
  acceptInvitation,
);
invitationRouter.post(
  '/:invitationId/decline',
  validateRequest(respondToInvitationSchema),
  declineInvitation,
);
