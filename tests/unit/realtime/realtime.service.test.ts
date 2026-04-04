import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeService } from '../../../src/modules/realtime/realtime.service';

import type { WhiteboardView } from '../../../src/modules/whiteboard/whiteboard.select';

const createWhiteboard = (overrides: Partial<WhiteboardView> = {}): WhiteboardView => {
  return {
    id: '7ee48f4e-e7f5-4adc-bc62-31c331d88c01',
    title: 'Original title',
    content: 'Original content',
    isShared: false,
    ownerId: '1ebc89f1-d6ec-47c3-bd15-e3345f7cfa49',
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
    ).rejects.toThrow('Only the whiteboard owner can broadcast changes.');
  });

  it('allows shared whiteboards to be joined by other authenticated users', async () => {
    const whiteboard = createWhiteboard({
      isShared: true,
    });
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(whiteboard),
      updateWhiteboard: vi.fn(),
    });

    await expect(service.getJoinState(whiteboard.id, 'viewer-user-id')).resolves.toMatchObject({
      id: whiteboard.id,
      isShared: true,
    });
  });
});
