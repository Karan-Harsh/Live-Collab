import { whiteboardSelect, type WhiteboardRecord } from './whiteboard.select';
import { prisma } from '../../config/prisma';

import type { Prisma } from '@prisma/client';

class WhiteboardRepository {
  async createWhiteboard(data: Prisma.WhiteboardUncheckedCreateInput): Promise<WhiteboardRecord> {
    return prisma.whiteboard.create({
      data,
      select: whiteboardSelect,
    });
  }

  async findById(whiteboardId: string): Promise<WhiteboardRecord | null> {
    return prisma.whiteboard.findUnique({
      select: whiteboardSelect,
      where: {
        id: whiteboardId,
      },
    });
  }

  async listAccessibleWhiteboards(userId: string): Promise<WhiteboardRecord[]> {
    return prisma.whiteboard.findMany({
      select: whiteboardSelect,
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            collaborators: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateWhiteboard(
    whiteboardId: string,
    data: Prisma.WhiteboardUpdateInput,
  ): Promise<WhiteboardRecord> {
    return prisma.whiteboard.update({
      select: whiteboardSelect,
      where: {
        id: whiteboardId,
      },
      data: {
        ...data,
        version: {
          increment: 1,
        },
      },
    });
  }

  async deleteWhiteboard(whiteboardId: string): Promise<void> {
    await prisma.whiteboard.delete({
      where: {
        id: whiteboardId,
      },
    });
  }
}

export const whiteboardRepository = new WhiteboardRepository();
