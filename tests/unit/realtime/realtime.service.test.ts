import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RealtimeService } from '../../../src/modules/realtime/realtime.service';

import type { DocumentView } from '../../../src/modules/document/document.select';

const createDocument = (overrides: Partial<DocumentView> = {}): DocumentView => {
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
    const document = createDocument();
    const updateDocument = vi.fn().mockResolvedValue(document);
    const service = new RealtimeService(
      {
        findById: vi.fn().mockResolvedValue(document),
        updateDocument,
      },
      250,
    );

    await service.stageDocumentChange(document.ownerId, {
      documentId: document.id,
      changes: {
        ops: [],
      },
      title: 'Updated title',
      content: 'Updated content',
    });

    expect(updateDocument).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);

    expect(updateDocument).toHaveBeenCalledWith(document.id, {
      title: 'Updated title',
      content: 'Updated content',
    });
  });

  it('denies edit access for non-owners', async () => {
    const document = createDocument();
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(document),
      updateDocument: vi.fn(),
    });

    await expect(
      service.stageDocumentChange('non-owner-user', {
        documentId: document.id,
        changes: {
          ops: [],
        },
        content: 'New content',
      }),
    ).rejects.toThrow('Only the document owner can broadcast changes.');
  });

  it('allows shared documents to be joined by other authenticated users', async () => {
    const document = createDocument({
      isShared: true,
    });
    const service = new RealtimeService({
      findById: vi.fn().mockResolvedValue(document),
      updateDocument: vi.fn(),
    });

    await expect(service.getJoinState(document.id, 'viewer-user-id')).resolves.toMatchObject({
      id: document.id,
      isShared: true,
    });
  });
});
