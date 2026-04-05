import { restore, serializeAsJSON } from '@excalidraw/excalidraw';

import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export interface StoredExcalidrawScene {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

const DEFAULT_BACKGROUND = '#f6f3ea';

export const createEmptyStoredScene = (): StoredExcalidrawScene => ({
  elements: [],
  appState: {
    viewBackgroundColor: DEFAULT_BACKGROUND,
  },
  files: {},
});

export const parseStoredExcalidrawScene = (content: string | null | undefined): StoredExcalidrawScene => {
  if (!content || content.trim().length === 0) {
    return createEmptyStoredScene();
  }

  try {
    const parsed = JSON.parse(content) as {
      elements?: unknown;
      appState?: Partial<AppState>;
      files?: BinaryFiles;
    };
    const restored = restore(
      {
        elements: parsed.elements as readonly OrderedExcalidrawElement[] | null | undefined,
        appState: {
          viewBackgroundColor: DEFAULT_BACKGROUND,
          ...(parsed.appState ?? {}),
        },
        files: parsed.files ?? {},
      },
      null,
      null,
    );

    return {
      elements: restored.elements,
      appState: restored.appState,
      files: restored.files,
    };
  } catch {
    return createEmptyStoredScene();
  }
};

export const serializeStoredExcalidrawScene = (
  elements: readonly OrderedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): string => {
  return serializeAsJSON(
    elements,
    {
      ...appState,
      viewBackgroundColor: appState.viewBackgroundColor ?? DEFAULT_BACKGROUND,
    },
    files,
    'database',
  );
};

export const getDefaultExcalidrawAppState = (): Partial<AppState> => ({
  viewBackgroundColor: DEFAULT_BACKGROUND,
});
