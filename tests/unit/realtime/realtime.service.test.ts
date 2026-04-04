import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeService } from '../../../src/modules/realtime/realtime.service';

import type { WhiteboardRecord } from '../../../src/modules/whiteboard/whiteboard.select';

const createWhiteboard = (overrides: Partial<WhiteboardRecord> = {}): WhiteboardRecord => {
  return {
    id: '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
    title: 'Original title',
    content: 'Original content',
    version: 1,
    ownerId: '1ebc89f1-d6ec-47c3-bd15-e3345f7cfa49',
    owner: {
      id: '1ebc89f1-d6ec-47c3-bd15-e3345f7cfa49',
      email: 'owner@example.com',
      name: 'Owner User',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    collaborators: [],
    invites: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
};

describe('RealtimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows owners to stage changes and flushes them with debounce', async () => {
    const whiteboard = createWhiteboard();
    const updateWhiteboard = vi.fn().mockResolvedValue(whiteboard);
    const service = new RealtimeService(
      {
        findById: vi.fn().mockResolvedValue(whiteboard),
        updateWhiteboard,
      },
      250,
    );

    await service.stageWhiteboardChange(whiteboard.ownerId, {
      whiteboardId: whiteboard.id,
      changes: {
        ops: [],
      },
      title: 'Updated title',
      content: 'Updated content',
    });

    expect(updateWhiteboard).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);

    expect(updateWhiteboard).toHaveBeenCalledWith(whiteboard.id, {
      title: 'Updated title',
      content: 'Updated content',
    });
  });

  it('denies edit access for non-owners', async () => {
    const whiteboard = createWhiteboard();
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(whiteboard),
      updateWhiteboard: vi.fn(),
    });

    await expect(
      service.stageWhiteboardChange('non-owner-user', {
        whiteboardId: whiteboard.id,
        changes: {
          ops: [],
        },
        content: 'New content',
      }),
    ).rejects.toThrow('Only the owner or an accepted collaborator can broadcast changes.');
  });

  it('allows invited collaborators to join whiteboards', async () => {
    const whiteboard = createWhiteboard({
      collaborators: [
        {
          id: '4f815ca5-30ad-4714-a3e4-8b796a38dfca',
          userId: 'viewer-user-id',
          role: 'EDITOR',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          user: {
            id: 'viewer-user-id',
            email: 'viewer@example.com',
            name: 'Viewer User',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ],
    });
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(whiteboard),
      updateWhiteboard: vi.fn(),
    });

    await expect(service.getJoinState(whiteboard.id, 'viewer-user-id')).resolves.toMatchObject({
      id: whiteboard.id,
      ownerId: whiteboard.ownerId,
    });
  });

  it('tracks active users per whiteboard across joins and disconnects', () => {
    const service = new RealtimeService({
      findById: vi.fn(),
      updateWhiteboard: vi.fn(),
    });

    expect(
      service.trackSocketWhiteboard(
        'socket-owner',
        '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
        'owner-user-id',
      ),
    ).toEqual(['owner-user-id']);

    expect(
      service.trackSocketWhiteboard(
        'socket-collaborator',
        '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
        'collaborator-user-id',
      ),
    ).toEqual(['owner-user-id', 'collaborator-user-id']);

    expect(
      service.untrackSocketWhiteboard(
        'socket-owner',
        '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
        'owner-user-id',
      ),
    ).toEqual(['collaborator-user-id']);

    expect(service.handleDisconnect('socket-collaborator', 'collaborator-user-id')).toEqual([
      {
        whiteboardId: '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
        activeUserIds: [],
      },
    ]);
  });

  it('stores and clears cursor presence for joined whiteboards', async () => {
    const whiteboard = createWhiteboard();
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(whiteboard),
      updateWhiteboard: vi.fn(),
    });

    service.trackSocketWhiteboard('socket-owner', whiteboard.id, whiteboard.ownerId);

    await expect(
      service.updateCursorPresence(whiteboard.ownerId, 'socket-owner', whiteboard.id, {
        x: 320,
        y: 180,
      }),
    ).resolves.toMatchObject({
      userId: whiteboard.ownerId,
      whiteboardId: whiteboard.id,
      cursor: {
        x: 320,
        y: 180,
      },
    });

    expect(service.getActiveCursors(whiteboard.id)).toHaveLength(1);

    await expect(
      service.updateCursorPresence(whiteboard.ownerId, 'socket-owner', whiteboard.id, null),
    ).resolves.toBeNull();

    expect(service.getActiveCursors(whiteboard.id)).toEqual([]);
  });
});
