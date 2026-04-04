import createHttpError from 'http-errors';

import { documentRepository } from './document.repository';
import { userService } from '../user/user.service';

import type { DocumentView } from './document.select';
import type { CreateDocumentDto, UpdateDocumentDto } from './document.types';
import type { Prisma } from '@prisma/client';

class DocumentService {
  async createDocument(ownerId: string, input: CreateDocumentDto): Promise<DocumentView> {
    await userService.ensureUserExists(ownerId);

    return documentRepository.createDocument({
      title: input.title,
      content: input.content,
      isShared: input.isShared ?? false,
      ownerId,
    });
  }

  async getDocumentById(documentId: string, requesterId: string): Promise<DocumentView> {
    const document = await documentRepository.findById(documentId);

    if (!document) {
      throw createHttpError(404, 'Document not found.');
    }

    if (document.ownerId !== requesterId && !document.isShared) {
      throw createHttpError(403, 'You do not have access to this document.');
    }

    return document;
  }

  async listDocuments(requesterId: string): Promise<DocumentView[]> {
    return documentRepository.listAccessibleDocuments(requesterId);
  }

  async updateDocument(
    documentId: string,
    requesterId: string,
    input: UpdateDocumentDto,
  ): Promise<DocumentView> {
    const document = await documentRepository.findById(documentId);

    if (!document) {
      throw createHttpError(404, 'Document not found.');
    }

    if (document.ownerId !== requesterId) {
      throw createHttpError(403, 'Only the document owner can update this document.');
    }

    const data: Prisma.DocumentUpdateInput = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.content !== undefined) {
      data.content = input.content;
    }

    if (input.isShared !== undefined) {
      data.isShared = input.isShared;
    }

    return documentRepository.updateDocument(documentId, data);
  }

  async deleteDocument(documentId: string, requesterId: string): Promise<void> {
    const document = await documentRepository.findById(documentId);

    if (!document) {
      throw createHttpError(404, 'Document not found.');
    }

    if (document.ownerId !== requesterId) {
      throw createHttpError(403, 'Only the document owner can delete this document.');
    }

    await documentRepository.deleteDocument(documentId);
  }
}

export const documentService = new DocumentService();
