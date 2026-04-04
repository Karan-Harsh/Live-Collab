import createHttpError from 'http-errors';

import { logRealtimeEvent } from './realtime.logger';
import { env } from '../../config/env';
import { whiteboardRepository } from '../whiteboard/whiteboard.repository';
import { whiteboardService } from '../whiteboard/whiteboard.service';

import type { SendChangesPayload } from './realtime.types';
import type { WhiteboardRecord } from '../whiteboard/whiteboard.select';
import type { Prisma } from '@prisma/client';

interface BufferedWhiteboardState {
  title: string;
  content: string;
  flushTimer: NodeJS.Timeout | null;
}

interface WhiteboardPersistenceGateway {
  findById(whiteboardId: string): Promise<WhiteboardRecord | null>;
  updateWhiteboard(
    whiteboardId: string,
    data: Prisma.WhiteboardUpdateInput,
  ): Promise<WhiteboardRecord>;
}

export class RealtimeService {
  private readonly whiteboardBuffers = new Map<string, BufferedWhiteboardState>();
  private readonly socketWhiteboards = new Map<string, Set<string>>();
  private readonly whiteboardPresence = new Map<string, Map<string, number>>();

  constructor(
    private readonly persistence: WhiteboardPersistenceGateway = whiteboardRepository,
    private readonly debounceMs: number = env.REALTIME_PERSIST_DEBOUNCE_MS,
  ) {}

  async getJoinState(whiteboardId: string, requesterId: string): Promise<WhiteboardRecord> {
    const whiteboard = await this.getAccessibleWhiteboard(whiteboardId, requesterId);
    const bufferedState = this.whiteboardBuffers.get(whiteboardId);

    if (!bufferedState) {
      return whiteboard;
    }

    return {
      ...whiteboard,
      title: bufferedState.title,
      content: bufferedState.content,
    };
  }

  async stageWhiteboardChange(requesterId: string, payload: SendChangesPayload): Promise<void> {
    const whiteboard = await this.ensureCanEdit(payload.whiteboardId, requesterId);
    const shouldPersistBufferedSnapshot =
      payload.title !== undefined || payload.content !== undefined;

    if (!shouldPersistBufferedSnapshot) {
      return;
    }

    const bufferedState = this.getOrCreateBuffer(whiteboard);

    if (payload.title !== undefined) {
      bufferedState.title = payload.title;
    }

    if (payload.content !== undefined) {
      bufferedState.content = payload.content;
    }

    this.scheduleFlush(payload.whiteboardId);
  }

  trackSocketWhiteboard(socketId: string, whiteboardId: string, userId: string): string[] {
    const activeWhiteboards = this.socketWhiteboards.get(socketId) ?? new Set<string>();
    activeWhiteboards.add(whiteboardId);
    this.socketWhiteboards.set(socketId, activeWhiteboards);

    const activeUsers = this.whiteboardPresence.get(whiteboardId) ?? new Map<string, number>();
    activeUsers.set(userId, (activeUsers.get(userId) ?? 0) + 1);
    this.whiteboardPresence.set(whiteboardId, activeUsers);

    return Array.from(activeUsers.keys());
  }

  untrackSocketWhiteboard(socketId: string, whiteboardId: string, userId: string): string[] {
    const activeWhiteboards = this.socketWhiteboards.get(socketId);

    if (!activeWhiteboards) {
      return this.getActiveUserIds(whiteboardId);
    }

    activeWhiteboards.delete(whiteboardId);

    if (activeWhiteboards.size === 0) {
      this.socketWhiteboards.delete(socketId);
    }

    const activeUsers = this.whiteboardPresence.get(whiteboardId);

    if (!activeUsers) {
      return [];
    }

    const remainingCount = (activeUsers.get(userId) ?? 0) - 1;

    if (remainingCount > 0) {
      activeUsers.set(userId, remainingCount);
    } else {
      activeUsers.delete(userId);
    }

    if (activeUsers.size === 0) {
      this.whiteboardPresence.delete(whiteboardId);
      return [];
    }

    return Array.from(activeUsers.keys());
  }

  handleDisconnect(socketId: string, userId: string): Array<{ whiteboardId: string; activeUserIds: string[] }> {
    const activeWhiteboards = this.socketWhiteboards.get(socketId);
    const whiteboardIds = activeWhiteboards ? Array.from(activeWhiteboards) : [];

    const disconnectState = whiteboardIds.map((whiteboardId) => ({
      whiteboardId,
      activeUserIds: this.untrackSocketWhiteboard(socketId, whiteboardId, userId),
    }));

    this.socketWhiteboards.delete(socketId);

    return disconnectState;
  }

  async shutdown(): Promise<void> {
    const whiteboardIds = Array.from(this.whiteboardBuffers.keys());

    await Promise.allSettled(
      whiteboardIds.map((whiteboardId) => this.flushWhiteboard(whiteboardId)),
    );
  }

  private async getAccessibleWhiteboard(
    whiteboardId: string,
    requesterId: string,
  ): Promise<WhiteboardRecord> {
    const whiteboard = await this.persistence.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (!whiteboardService.canAccessWhiteboard(whiteboard, requesterId)) {
      throw createHttpError(403, 'You do not have access to this whiteboard.');
    }

    return whiteboard;
  }

  private async ensureCanEdit(whiteboardId: string, requesterId: string): Promise<WhiteboardRecord> {
    const whiteboard = await this.persistence.findById(whiteboardId);

    if (!whiteboard) {
      throw createHttpError(404, 'Whiteboard not found.');
    }

    if (!whiteboardService.canEditWhiteboard(whiteboard, requesterId)) {
      throw createHttpError(403, 'Only the owner or an accepted collaborator can broadcast changes.');
    }

    return whiteboard;
  }

  private getOrCreateBuffer(whiteboard: WhiteboardRecord): BufferedWhiteboardState {
    const existingBuffer = this.whiteboardBuffers.get(whiteboard.id);

    if (existingBuffer) {
      return existingBuffer;
    }

    const initialBuffer: BufferedWhiteboardState = {
      title: whiteboard.title,
      content: whiteboard.content,
      flushTimer: null,
    };

    this.whiteboardBuffers.set(whiteboard.id, initialBuffer);

    return initialBuffer;
  }

  private scheduleFlush(whiteboardId: string): void {
    const buffer = this.whiteboardBuffers.get(whiteboardId);

    if (!buffer) {
      return;
    }

    if (buffer.flushTimer) {
      clearTimeout(buffer.flushTimer);
    }

    buffer.flushTimer = setTimeout(() => {
      void this.flushWhiteboard(whiteboardId).catch((error: unknown) => {
        console.error('Failed to flush realtime whiteboard changes.', error);
      });
    }, this.debounceMs);
  }

  getActiveUserIds(whiteboardId: string): string[] {
    return Array.from(this.whiteboardPresence.get(whiteboardId)?.keys() ?? []);
  }

  private async flushWhiteboard(whiteboardId: string): Promise<void> {
    const buffer = this.whiteboardBuffers.get(whiteboardId);

    if (!buffer) {
      return;
    }

    if (buffer.flushTimer) {
      clearTimeout(buffer.flushTimer);
      buffer.flushTimer = null;
    }

    await this.persistence.updateWhiteboard(whiteboardId, {
      title: buffer.title,
      content: buffer.content,
    });

    this.whiteboardBuffers.delete(whiteboardId);
    logRealtimeEvent('Flushed buffered whiteboard changes.', {
      whiteboardId,
    });
  }
}

export const realtimeService = new RealtimeService();
