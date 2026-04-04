import { documentSelect, type DocumentView } from './document.select';
import { prisma } from '../../config/prisma';

import type { Prisma } from '@prisma/client';

class DocumentRepository {
  async createDocument(data: Prisma.DocumentUncheckedCreateInput): Promise<DocumentView> {
    return prisma.document.create({
      data,
      select: documentSelect,
    });
  }

  async findById(documentId: string): Promise<DocumentView | null> {
    return prisma.document.findUnique({
      select: documentSelect,
      where: {
        id: documentId,
      },
    });
  }

  async listAccessibleDocuments(userId: string): Promise<DocumentView[]> {
    return prisma.document.findMany({
      select: documentSelect,
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            isShared: true,
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateDocument(
    documentId: string,
    data: Prisma.DocumentUpdateInput,
  ): Promise<DocumentView> {
    return prisma.document.update({
      select: documentSelect,
      where: {
        id: documentId,
      },
      data: {
        ...data,
        version: {
          increment: 1,
        },
      },
    });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });
  }
}

export const documentRepository = new DocumentRepository();
