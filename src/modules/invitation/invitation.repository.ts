import { prisma } from '../../config/prisma';

import type { Prisma, WhiteboardInviteStatus } from '@prisma/client';

const invitationSelect = {
  id: true,
  whiteboardId: true,
  inviterId: true,
  recipientId: true,
  status: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  inviter: {
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  recipient: {
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  whiteboard: {
    select: {
      id: true,
      title: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.WhiteboardInviteSelect;

export type InvitationRecord = Prisma.WhiteboardInviteGetPayload<{
  select: typeof invitationSelect;
}>;

class InvitationRepository {
  async listPendingForRecipient(recipientId: string): Promise<InvitationRecord[]> {
    return prisma.whiteboardInvite.findMany({
      select: invitationSelect,
      where: {
        recipientId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(invitationId: string): Promise<InvitationRecord | null> {
    return prisma.whiteboardInvite.findUnique({
      select: invitationSelect,
      where: {
        id: invitationId,
      },
    });
  }

  async upsertInvitation(
    whiteboardId: string,
    inviterId: string,
    recipientId: string,
  ): Promise<InvitationRecord> {
    return prisma.whiteboardInvite.upsert({
      where: {
        whiteboardId_recipientId: {
          whiteboardId,
          recipientId,
        },
      },
      create: {
        whiteboardId,
        inviterId,
        recipientId,
        status: 'PENDING',
      },
      update: {
        inviterId,
        status: 'PENDING',
        respondedAt: null,
      },
      select: invitationSelect,
    });
  }

  async respondToInvitation(
    invitationId: string,
    recipientId: string,
    status: Extract<WhiteboardInviteStatus, 'ACCEPTED' | 'DECLINED'>,
  ): Promise<InvitationRecord> {
    return prisma.$transaction(async (transaction) => {
      const invite = await transaction.whiteboardInvite.findUnique({
        select: invitationSelect,
        where: {
          id: invitationId,
        },
      });

      if (!invite || invite.recipientId !== recipientId) {
        throw new Error('INVITE_NOT_FOUND');
      }

      const updatedInvite = await transaction.whiteboardInvite.update({
        where: {
          id: invitationId,
        },
        data: {
          status,
          respondedAt: new Date(),
        },
        select: invitationSelect,
      });

      if (status === 'ACCEPTED') {
        await transaction.whiteboardCollaborator.upsert({
          where: {
            whiteboardId_userId: {
              whiteboardId: invite.whiteboardId,
              userId: recipientId,
            },
          },
          create: {
            whiteboardId: invite.whiteboardId,
            userId: recipientId,
            invitedById: invite.inviterId,
          },
          update: {},
        });
      }

      return updatedInvite;
    });
  }
}

export const invitationRepository = new InvitationRepository();
