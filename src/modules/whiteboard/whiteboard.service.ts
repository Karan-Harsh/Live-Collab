import createHttpError from 'http-errors';

import { whiteboardRepository } from './whiteboard.repository';
import { userService } from '../user/user.service';

import type { WhiteboardView } from './whiteboard.select';
import type { CreateWhiteboardDto, UpdateWhiteboardDto } from './whiteboard.types';
import type { Prisma } from '@prisma/client';

class WhiteboardService {
  async createWhiteboard(ownerId: string, input: CreateWhiteboardDto): Promise<WhiteboardView> {
    await userService.ensureUserExists(ownerId);

    return whiteboardRepository.createWhiteboard({
      title: input.title,
      content: input.content,
      isShared: input.isShared ?? false,
      ownerId,
    });
  }

  async getWhiteboardById(whiteboardId: string, requesterId: string): Promise<WhiteboardView> {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (whiteboard.ownerId !== requesterId && !whiteboard.isShared) {
      throw createHttpError(403, 'You do not have access to this whiteboard.');
    }

    return whiteboard;
  }

  async listWhiteboards(requesterId: string): Promise<WhiteboardView[]> {
    return whiteboardRepository.listAccessibleWhiteboards(requesterId);
  }

  async updateWhiteboard(
    whiteboardId: string,
    requesterId: string,
    input: UpdateWhiteboardDto,
  ): Promise<WhiteboardView> {
    const whiteboard = await whiteboardRepository.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (whiteboard.ownerId !== requesterId) {
      throw createHttpError(403, 'Only the whiteboard owner can update this whiteboard.');
    }

    const data: Prisma.WhiteboardUpdateInput = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.content !== undefined) {
      data.content = input.content;
    }

    if (input.isShared !== undefined) {
      data.isShared = input.isShared;
    }

    return whiteboardRepository.updateWhiteboard(whiteboardId, data);
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
}

export const whiteboardService = new WhiteboardService();
