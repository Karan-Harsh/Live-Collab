import createHttpError from 'http-errors';

import { logRealtimeEvent } from './realtime.logger';
import { env } from '../../config/env';
import { documentRepository } from '../document/document.repository';

import type { SendChangesPayload } from './realtime.types';
import type { DocumentView } from '../document/document.select';
import type { Prisma } from '@prisma/client';

interface BufferedDocumentState {
  title: string;
  content: string;
  flushTimer: NodeJS.Timeout | null;
}

interface DocumentPersistenceGateway {
  findById(documentId: string): Promise<DocumentView | null>;
  updateDocument(documentId: string, data: Prisma.DocumentUpdateInput): Promise<DocumentView>;
}

export class RealtimeService {
  private readonly documentBuffers = new Map<string, BufferedDocumentState>();
  private readonly socketDocuments = new Map<string, Set<string>>();

  constructor(
    private readonly persistence: DocumentPersistenceGateway = documentRepository,
    private readonly debounceMs: number = env.REALTIME_PERSIST_DEBOUNCE_MS,
  ) {}

  async getJoinState(documentId: string, requesterId: string): Promise<DocumentView> {
    const document = await this.getAccessibleDocument(documentId, requesterId);
    const bufferedState = this.documentBuffers.get(documentId);

    if (!bufferedState) {
      return document;
    }

    return {
      ...document,
      title: bufferedState.title,
      content: bufferedState.content,
    };
  }

  async stageDocumentChange(requesterId: string, payload: SendChangesPayload): Promise<void> {
    const document = await this.ensureCanEdit(payload.documentId, requesterId);
    const shouldPersistBufferedSnapshot =
      payload.title !== undefined || payload.content !== undefined;

    if (!shouldPersistBufferedSnapshot) {
      return;
    }

    const bufferedState = this.getOrCreateBuffer(document);

    if (payload.title !== undefined) {
      bufferedState.title = payload.title;
    }

    if (payload.content !== undefined) {
      bufferedState.content = payload.content;
    }

    this.scheduleFlush(payload.documentId);
  }

  trackSocketDocument(socketId: string, documentId: string): void {
    const activeDocuments = this.socketDocuments.get(socketId) ?? new Set<string>();
    activeDocuments.add(documentId);
    this.socketDocuments.set(socketId, activeDocuments);
  }

  untrackSocketDocument(socketId: string, documentId: string): void {
    const activeDocuments = this.socketDocuments.get(socketId);

    if (!activeDocuments) {
      return;
    }

    activeDocuments.delete(documentId);

    if (activeDocuments.size === 0) {
      this.socketDocuments.delete(socketId);
    }
  }

  handleDisconnect(socketId: string): string[] {
    const activeDocuments = this.socketDocuments.get(socketId);
    const documentIds = activeDocuments ? Array.from(activeDocuments) : [];

    this.socketDocuments.delete(socketId);

    return documentIds;
  }

  async shutdown(): Promise<void> {
    const documentIds = Array.from(this.documentBuffers.keys());

    await Promise.allSettled(documentIds.map((documentId) => this.flushDocument(documentId)));
  }

  private async getAccessibleDocument(
    documentId: string,
    requesterId: string,
  ): Promise<DocumentView> {
    const document = await this.persistence.findById(documentId);

    if (!document) {
      throw createHttpError(404, 'Document not found.');
    }

    if (document.ownerId !== requesterId && !document.isShared) {
      throw createHttpError(403, 'You do not have access to this document.');
    }

    return document;
  }

  private async ensureCanEdit(documentId: string, requesterId: string): Promise<DocumentView> {
    const document = await this.persistence.findById(documentId);

    if (!document) {
      throw createHttpError(404, 'Document not found.');
    }

    if (document.ownerId !== requesterId) {
      throw createHttpError(403, 'Only the document owner can broadcast changes.');
    }

    return document;
  }

  private getOrCreateBuffer(document: DocumentView): BufferedDocumentState {
    const existingBuffer = this.documentBuffers.get(document.id);

    if (existingBuffer) {
      return existingBuffer;
    }

    const initialBuffer: BufferedDocumentState = {
      title: document.title,
      content: document.content,
      flushTimer: null,
    };

    this.documentBuffers.set(document.id, initialBuffer);

    return initialBuffer;
  }

  private scheduleFlush(documentId: string): void {
    const buffer = this.documentBuffers.get(documentId);

    if (!buffer) {
      return;
    }

    if (buffer.flushTimer) {
      clearTimeout(buffer.flushTimer);
    }

    buffer.flushTimer = setTimeout(() => {
      void this.flushDocument(documentId).catch((error: unknown) => {
        console.error('Failed to flush realtime document changes.', error);
      });
    }, this.debounceMs);
  }

  private async flushDocument(documentId: string): Promise<void> {
    const buffer = this.documentBuffers.get(documentId);

    if (!buffer) {
      return;
    }

    if (buffer.flushTimer) {
      clearTimeout(buffer.flushTimer);
      buffer.flushTimer = null;
    }

    await this.persistence.updateDocument(documentId, {
      title: buffer.title,
      content: buffer.content,
    });

    this.documentBuffers.delete(documentId);
    logRealtimeEvent('Flushed buffered document changes.', {
      documentId,
    });
  }
}

export const realtimeService = new RealtimeService();
