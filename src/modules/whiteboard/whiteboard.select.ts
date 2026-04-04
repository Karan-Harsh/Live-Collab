import { publicUserSelect } from '../user/user.select';

import type { Prisma } from '@prisma/client';

export const whiteboardCollaboratorSelect = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: publicUserSelect,
  },
} satisfies Prisma.WhiteboardCollaboratorSelect;

export const whiteboardInviteSelect = {
  id: true,
  whiteboardId: true,
  inviterId: true,
  recipientId: true,
  status: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  inviter: {
    select: publicUserSelect,
  },
  recipient: {
    select: publicUserSelect,
  },
} satisfies Prisma.WhiteboardInviteSelect;

export const whiteboardSelect = {
  id: true,
  title: true,
  content: true,
  version: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: publicUserSelect,
  },
  collaborators: {
    select: whiteboardCollaboratorSelect,
  },
  invites: {
    where: {
      status: 'PENDING',
    },
    select: whiteboardInviteSelect,
  },
} satisfies Prisma.WhiteboardSelect;

export type WhiteboardCollaboratorView = Prisma.WhiteboardCollaboratorGetPayload<{
  select: typeof whiteboardCollaboratorSelect;
}>;

export type WhiteboardInviteView = Prisma.WhiteboardInviteGetPayload<{
  select: typeof whiteboardInviteSelect;
}>;

export type WhiteboardRecord = Prisma.WhiteboardGetPayload<{
  select: typeof whiteboardSelect;
}>;
