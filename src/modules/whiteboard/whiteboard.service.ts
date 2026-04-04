import createHttpError from 'http-errors';

import { whiteboardRepository } from './whiteboard.repository';
import { userService } from '../user/user.service';

import type { WhiteboardRecord } from './whiteboard.select';
import type {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  WhiteboardResponse,
} from './whiteboard.types';
import type { Prisma, WhiteboardCollaboratorRole } from '@prisma/client';

class WhiteboardService {
  async createWhiteboard(ownerId: string, input: CreateWhiteboardDto): Promise<WhiteboardResponse> {
    await userService.ensureUserExists(ownerId);

    const whiteboard = await whiteboardRepository.createWhiteboard({
      title: input.title,
      content: input.content,
      ownerId,
    });

    return this.serializeWhiteboard(whiteboard, ownerId);
  }

  async getWhiteboardById(whiteboardId: string, requesterId: string): Promise<WhiteboardResponse> {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (!this.canAccessWhiteboard(whiteboard, requesterId)) {
      throw createHttpError(403, 'You do not have access to this whiteboard.');
    }

    return this.serializeWhiteboard(whiteboard, requesterId);
  }

  async listWhiteboards(requesterId: string): Promise<WhiteboardResponse[]> {
    const whiteboards = await whiteboardRepository.listAccessibleWhiteboards(requesterId);

    return whiteboards.map((whiteboard) => this.serializeWhiteboard(whiteboard, requesterId));
  }

  async updateWhiteboard(
    whiteboardId: string,
    requesterId: string,
    input: UpdateWhiteboardDto,
  ): Promise<WhiteboardResponse> {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (!this.canEditWhiteboard(whiteboard, requesterId)) {
      throw createHttpError(
        403,
        'Only the owner or an accepted collaborator can update this whiteboard.',
      );
    }

    const data: Prisma.WhiteboardUpdateInput = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.content !== undefined) {
      data.content = input.content;
    }

    const updatedWhiteboard = await whiteboardRepository.updateWhiteboard(whiteboardId, data);

    return this.serializeWhiteboard(updatedWhiteboard, requesterId);
  }

  async deleteWhiteboard(whiteboardId: string, requesterId: string): Promise<void> {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (whiteboard.ownerId !== requesterId) {
      throw createHttpError(403, 'Only the whiteboard owner can delete this whiteboard.');
    }

    await whiteboardRepository.deleteWhiteboard(whiteboardId);
  }

  canAccessWhiteboard(whiteboard: WhiteboardRecord, requesterId: string): boolean {
    return (
      whiteboard.ownerId === requesterId ||
      (whiteboard.collaborators ?? []).some((collaborator) => collaborator.userId === requesterId)
    );
  }

  canEditWhiteboard(whiteboard: WhiteboardRecord, requesterId: string): boolean {
    return this.canAccessWhiteboard(whiteboard, requesterId);
  }

  isWhiteboardOwner(whiteboard: WhiteboardRecord, requesterId: string): boolean {
    return whiteboard.ownerId === requesterId;
  }

  hasCollaborator(whiteboard: WhiteboardRecord, userId: string): boolean {
    return (whiteboard.collaborators ?? []).some((collaborator) => collaborator.userId === userId);
  }

  serializeWhiteboard(
    whiteboard: WhiteboardRecord,
    requesterId: string,
  ): WhiteboardResponse {
    const accessRole = this.isWhiteboardOwner(whiteboard, requesterId) ? 'owner' : 'collaborator';

    return {
      id: whiteboard.id,
      title: whiteboard.title,
      content: whiteboard.content,
      version: whiteboard.version,
      ownerId: whiteboard.ownerId,
      createdAt: whiteboard.createdAt,
      updatedAt: whiteboard.updatedAt,
      owner: whiteboard.owner,
      accessRole,
      permissions: {
        canEdit: this.canEditWhiteboard(whiteboard, requesterId),
        canDelete: this.isWhiteboardOwner(whiteboard, requesterId),
        canInvite: this.isWhiteboardOwner(whiteboard, requesterId),
        canManageAccess: this.isWhiteboardOwner(whiteboard, requesterId),
      },
      collaborators: (whiteboard.collaborators ?? []).map((collaborator) => ({
        id: collaborator.id,
        userId: collaborator.userId,
        role: collaborator.role as WhiteboardCollaboratorRole,
        createdAt: collaborator.createdAt,
        updatedAt: collaborator.updatedAt,
        user: collaborator.user,
      })),
      pendingInvites: this.isWhiteboardOwner(whiteboard, requesterId)
        ? (whiteboard.invites ?? []).map((invite) => ({
            id: invite.id,
            whiteboardId: invite.whiteboardId,
            inviterId: invite.inviterId,
            recipientId: invite.recipientId,
            status: 'PENDING' as const,
            respondedAt: invite.respondedAt,
            createdAt: invite.createdAt,
            updatedAt: invite.updatedAt,
            inviter: invite.inviter,
            recipient: invite.recipient,
          }))
        : [],
    };
  }
}

export const whiteboardService = new WhiteboardService();
