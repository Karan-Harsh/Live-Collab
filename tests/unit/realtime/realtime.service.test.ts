import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeService } from '../../../src/modules/realtime/realtime.service';

import type { WhiteboardView } from '../../../src/modules/whiteboard/whiteboard.select';

const createWhiteboard = (overrides: Partial<WhiteboardView> = {}): WhiteboardView => {
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
});
