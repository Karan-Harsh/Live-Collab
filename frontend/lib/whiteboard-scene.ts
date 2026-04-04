export const SCENE_WIDTH = 2400;
export const SCENE_HEIGHT = 1600;
export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

export type WhiteboardTool = 'select' | 'hand' | 'draw' | 'rectangle' | 'ellipse' | 'note';
export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';

export interface ScenePoint {
  x: number;
  y: number;
}

interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  stroke: string;
  fill: string;
  strokeWidth: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  stroke: string;
  fill: string;
  strokeWidth: number;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: ScenePoint[];
  stroke: string;
  strokeWidth: number;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  text: string;
  fill: string;
  textColor: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt: string;
}

export type WhiteboardElement =
  | RectangleElement
  | EllipseElement
  | StrokeElement
  | NoteElement
  | ImageElement;

export interface WhiteboardScene {
  version: 1;
  background: string;
  elements: WhiteboardElement[];
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface SceneSnapshotChangeSummary {
  type: 'scene_snapshot';
  changedElementIds: string[];
  removedElementIds: string[];
  orderedElementIds: string[];
  sceneUpdatedAt: string;
}

interface ElementMinimumSize {
  width: number;
  height: number;
}

const nowIso = (): string => new Date().toISOString();

export const createElementId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `element-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEmptyScene = (): WhiteboardScene => ({
  version: 1,
  background: '#fffdf8',
  elements: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isPoint = (value: unknown): value is ScenePoint => {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
};

const coerceTimestamp = (value: unknown): string => {
  return typeof value === 'string' ? value : nowIso();
};

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' ? value : fallback;
};

const toTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const coerceBaseElement = (value: Record<string, unknown>) => ({
  id: asString(value.id, createElementId()),
  x: asNumber(value.x, 0),
  y: asNumber(value.y, 0),
  width: asNumber(value.width, 0),
  height: asNumber(value.height, 0),
  createdAt: coerceTimestamp(value.createdAt),
  updatedAt: coerceTimestamp(value.updatedAt),
});

const coerceElement = (value: unknown): WhiteboardElement | null => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  const base = coerceBaseElement(value);

  switch (value.type) {
    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        stroke: asString(value.stroke, '#0f172a'),
        fill: asString(value.fill, 'rgba(45,212,191,0.14)'),
        strokeWidth: asNumber(value.strokeWidth, 3),
      };
    case 'ellipse':
      return {
        ...base,
        type: 'ellipse',
        stroke: asString(value.stroke, '#1d4ed8'),
        fill: asString(value.fill, 'rgba(59,130,246,0.14)'),
        strokeWidth: asNumber(value.strokeWidth, 3),
      };
    case 'stroke':
      return {
        ...base,
        type: 'stroke',
        points: Array.isArray(value.points) ? value.points.filter(isPoint) : [],
        stroke: asString(value.stroke, '#111827'),
        strokeWidth: asNumber(value.strokeWidth, 4),
      };
    case 'note':
      return {
        ...base,
        type: 'note',
        text: asString(value.text, 'New note'),
        fill: asString(value.fill, '#fef08a'),
        textColor: asString(value.textColor, '#1f2937'),
      };
    case 'image':
      return {
        ...base,
        type: 'image',
        src: asString(value.src, ''),
        alt: asString(value.alt, 'Whiteboard image'),
      };
    default:
      return null;
  }
};

export const parseSceneFromContent = (content: string): WhiteboardScene => {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return createEmptyScene();
  }

  try {
    const parsed = JSON.parse(trimmedContent) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.elements)) {
      throw new Error('Invalid scene payload.');
    }

    return {
      version: 1,
      background: asString(parsed.background, '#fffdf8'),
      elements: parsed.elements
        .map((element) => coerceElement(element))
        .filter((element): element is WhiteboardElement => element !== null),
    };
  } catch {
    return {
      version: 1,
      background: '#fffdf8',
      elements: [
        {
          id: createElementId(),
          type: 'note',
          x: 180,
          y: 180,
          width: 360,
          height: 220,
          text: trimmedContent,
          fill: '#fef08a',
          textColor: '#1f2937',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
    };
  }
};

export const serializeScene = (scene: WhiteboardScene): string => {
  return JSON.stringify(scene);
};

export const buildSceneSnapshotChangeSummary = (
  previousScene: WhiteboardScene,
  nextScene: WhiteboardScene,
): SceneSnapshotChangeSummary => {
  const previousElementIds = new Set(previousScene.elements.map((element) => element.id));
  const nextElementIds = new Set(nextScene.elements.map((element) => element.id));

  const changedElementIds = nextScene.elements
    .filter((element) => {
      const previousElement = previousScene.elements.find(
        (candidateElement) => candidateElement.id === element.id,
      );

      if (!previousElement) {
        return true;
      }

      return JSON.stringify(previousElement) !== JSON.stringify(element);
    })
    .map((element) => element.id);

  const removedElementIds = Array.from(previousElementIds).filter((elementId) => {
    return !nextElementIds.has(elementId);
  });

  return {
    type: 'scene_snapshot',
    changedElementIds,
    removedElementIds,
    orderedElementIds: nextScene.elements.map((element) => element.id),
    sceneUpdatedAt: nowIso(),
  };
};

export const isSceneSnapshotChangeSummary = (
  value: unknown,
): value is SceneSnapshotChangeSummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === 'scene_snapshot' &&
    Array.isArray(value.changedElementIds) &&
    Array.isArray(value.removedElementIds) &&
    Array.isArray(value.orderedElementIds) &&
    typeof value.sceneUpdatedAt === 'string'
  );
};

export const mergeScenes = (
  localScene: WhiteboardScene,
  remoteScene: WhiteboardScene,
  summary?: SceneSnapshotChangeSummary,
): WhiteboardScene => {
  const localElementMap = new Map(localScene.elements.map((element) => [element.id, element]));
  const remoteElementMap = new Map(remoteScene.elements.map((element) => [element.id, element]));
  const removedElementIds = new Set(summary?.removedElementIds ?? []);
  const deletionTimestamp = toTimestamp(summary?.sceneUpdatedAt ?? nowIso());
  const resolvedElements = new Map<string, WhiteboardElement>();
  const allElementIds = new Set([
    ...localScene.elements.map((element) => element.id),
    ...remoteScene.elements.map((element) => element.id),
  ]);

  for (const elementId of allElementIds) {
    const localElement = localElementMap.get(elementId);
    const remoteElement = remoteElementMap.get(elementId);

    if (removedElementIds.has(elementId)) {
      if (localElement && toTimestamp(localElement.updatedAt) > deletionTimestamp) {
        resolvedElements.set(elementId, localElement);
      }

      continue;
    }

    if (localElement && remoteElement) {
      resolvedElements.set(
        elementId,
        toTimestamp(localElement.updatedAt) > toTimestamp(remoteElement.updatedAt)
          ? localElement
          : remoteElement,
      );
      continue;
    }

    if (remoteElement) {
      resolvedElements.set(elementId, remoteElement);
      continue;
    }

    if (localElement) {
      resolvedElements.set(elementId, localElement);
    }
  }

  const nextElements: WhiteboardElement[] = [];
  const orderedElementIds = summary?.orderedElementIds ?? remoteScene.elements.map((element) => element.id);

  for (const elementId of orderedElementIds) {
    const resolvedElement = resolvedElements.get(elementId);

    if (!resolvedElement) {
      continue;
    }

    nextElements.push(resolvedElement);
    resolvedElements.delete(elementId);
  }

  for (const element of localScene.elements) {
    const remainingElement = resolvedElements.get(element.id);

    if (!remainingElement) {
      continue;
    }

    nextElements.push(remainingElement);
    resolvedElements.delete(element.id);
  }

  for (const element of remoteScene.elements) {
    const remainingElement = resolvedElements.get(element.id);

    if (!remainingElement) {
      continue;
    }

    nextElements.push(remainingElement);
    resolvedElements.delete(element.id);
  }

  return {
    version: 1,
    background: remoteScene.background || localScene.background,
    elements: nextElements,
  };
};

export const getElementBounds = (
  element: WhiteboardElement,
): { x: number; y: number; width: number; height: number } => {
  if (element.type !== 'stroke') {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  const xs = element.points.map((point) => point.x);
  const ys = element.points.map((point) => point.y);
  const minX = xs.length > 0 ? Math.min(...xs) : element.x;
  const maxX = xs.length > 0 ? Math.max(...xs) : element.x;
  const minY = ys.length > 0 ? Math.min(...ys) : element.y;
  const maxY = ys.length > 0 ? Math.max(...ys) : element.y;

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
};

export const isPointInsideElement = (
  element: WhiteboardElement,
  point: ScenePoint,
): boolean => {
  const bounds = getElementBounds(element);

  if (element.type === 'ellipse') {
    const radiusX = Math.max(bounds.width / 2, 1);
    const radiusY = Math.max(bounds.height / 2, 1);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const normalizedX = (point.x - centerX) / radiusX;
    const normalizedY = (point.y - centerY) / radiusY;

    return normalizedX ** 2 + normalizedY ** 2 <= 1;
  }

  const padding = element.type === 'stroke' ? Math.max(element.strokeWidth * 1.5, 12) : 0;

  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
};

export const getTopmostElementAtPoint = (
  scene: WhiteboardScene,
  point: ScenePoint,
): WhiteboardElement | null => {
  for (let index = scene.elements.length - 1; index >= 0; index -= 1) {
    const element = scene.elements[index];

    if (isPointInsideElement(element, point)) {
      return element;
    }
  }

  return null;
};

export const upsertElement = (
  scene: WhiteboardScene,
  nextElement: WhiteboardElement,
): WhiteboardScene => {
  const existingIndex = scene.elements.findIndex((element) => element.id === nextElement.id);

  if (existingIndex === -1) {
    return {
      ...scene,
      elements: [...scene.elements, nextElement],
    };
  }

  const nextElements = [...scene.elements];
  nextElements[existingIndex] = nextElement;

  return {
    ...scene,
    elements: nextElements,
  };
};

export const removeElement = (scene: WhiteboardScene, elementId: string): WhiteboardScene => {
  return {
    ...scene,
    elements: scene.elements.filter((element) => element.id !== elementId),
  };
};

export const duplicateElement = (
  scene: WhiteboardScene,
  elementId: string,
): { scene: WhiteboardScene; duplicatedElementId: string | null } => {
  const sourceElement = scene.elements.find((element) => element.id === elementId);

  if (!sourceElement) {
    return {
      scene,
      duplicatedElementId: null,
    };
  }

  const duplicatedElement = {
    ...sourceElement,
    id: createElementId(),
    x: sourceElement.x + 32,
    y: sourceElement.y + 32,
    points:
      sourceElement.type === 'stroke'
        ? sourceElement.points.map((point) => ({
            x: point.x + 32,
            y: point.y + 32,
          }))
        : undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } as WhiteboardElement;

  return {
    scene: {
      ...scene,
      elements: [...scene.elements, duplicatedElement],
    },
    duplicatedElementId: duplicatedElement.id,
  };
};

export const reorderElement = (
  scene: WhiteboardScene,
  elementId: string,
  direction: 'forward' | 'backward' | 'front' | 'back',
): WhiteboardScene => {
  const currentIndex = scene.elements.findIndex((element) => element.id === elementId);

  if (currentIndex === -1) {
    return scene;
  }

  const nextElements = [...scene.elements];
  const [targetElement] = nextElements.splice(currentIndex, 1);

  if (!targetElement) {
    return scene;
  }

  let nextIndex = currentIndex;

  if (direction === 'forward') {
    nextIndex = Math.min(currentIndex + 1, nextElements.length);
  }

  if (direction === 'backward') {
    nextIndex = Math.max(currentIndex - 1, 0);
  }

  if (direction === 'front') {
    nextIndex = nextElements.length;
  }

  if (direction === 'back') {
    nextIndex = 0;
  }

  nextElements.splice(nextIndex, 0, targetElement);

  return {
    ...scene,
    elements: nextElements,
  };
};

export const translateElement = (
  element: WhiteboardElement,
  deltaX: number,
  deltaY: number,
): WhiteboardElement => {
  const updatedAt = nowIso();

  if (element.type === 'stroke') {
    return {
      ...element,
      x: element.x + deltaX,
      y: element.y + deltaY,
      points: element.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      })),
      updatedAt,
    };
  }

  return {
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY,
    updatedAt,
  };
};

export const isElementResizable = (element: WhiteboardElement): boolean => {
  return element.type !== 'stroke';
};

const getElementMinimumSize = (element: WhiteboardElement): ElementMinimumSize => {
  if (element.type === 'note') {
    return {
      width: 180,
      height: 120,
    };
  }

  if (element.type === 'image') {
    return {
      width: 120,
      height: 120,
    };
  }

  return {
    width: 48,
    height: 48,
  };
};

export const resizeElement = (
  element: WhiteboardElement,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): WhiteboardElement => {
  if (!isElementResizable(element)) {
    return element;
  }

  const minimumSize = getElementMinimumSize(element);
  let nextX = element.x;
  let nextY = element.y;
  let nextWidth = element.width;
  let nextHeight = element.height;

  if (handle === 'nw' || handle === 'sw') {
    nextX = element.x + deltaX;
    nextWidth = element.width - deltaX;
  }

  if (handle === 'ne' || handle === 'se') {
    nextWidth = element.width + deltaX;
  }

  if (handle === 'nw' || handle === 'ne') {
    nextY = element.y + deltaY;
    nextHeight = element.height - deltaY;
  }

  if (handle === 'sw' || handle === 'se') {
    nextHeight = element.height + deltaY;
  }

  if (nextWidth < minimumSize.width) {
    if (handle === 'nw' || handle === 'sw') {
      nextX -= minimumSize.width - nextWidth;
    }

    nextWidth = minimumSize.width;
  }

  if (nextHeight < minimumSize.height) {
    if (handle === 'nw' || handle === 'ne') {
      nextY -= minimumSize.height - nextHeight;
    }

    nextHeight = minimumSize.height;
  }

  return {
    ...element,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
    updatedAt: nowIso(),
  };
};

export const clampViewportZoom = (zoom: number): number => {
  return Math.min(Math.max(zoom, 0.45), 2.25);
};

export const normalizeRectangle = (
  start: ScenePoint,
  current: ScenePoint,
): { x: number; y: number; width: number; height: number } => {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.max(Math.abs(current.x - start.x), 24);
  const height = Math.max(Math.abs(current.y - start.y), 24);

  return {
    x,
    y,
    width,
    height,
  };
};

export const buildStrokePath = (points: ScenePoint[]): string => {
  if (points.length === 0) {
    return '';
  }

  const [firstPoint, ...remainingPoints] = points;
  return [`M ${firstPoint.x} ${firstPoint.y}`, ...remainingPoints.map((point) => `L ${point.x} ${point.y}`)].join(' ');
};

export const createShapeElement = (
  type: 'rectangle' | 'ellipse',
  start: ScenePoint,
  current: ScenePoint,
): RectangleElement | EllipseElement => {
  const bounds = normalizeRectangle(start, current);
  const base = {
    id: createElementId(),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    strokeWidth: 3,
  };

  if (type === 'rectangle') {
    return {
      ...base,
      type: 'rectangle',
      stroke: '#0f172a',
      fill: 'rgba(20,184,166,0.14)',
    };
  }

  return {
    ...base,
    type: 'ellipse',
    stroke: '#1d4ed8',
    fill: 'rgba(96,165,250,0.18)',
  };
};

export const createStrokeElement = (points: ScenePoint[]): StrokeElement => {
  const bounds = getElementBounds({
    id: createElementId(),
    type: 'stroke',
    x: points[0]?.x ?? 0,
    y: points[0]?.y ?? 0,
    width: 0,
    height: 0,
    points,
    stroke: '#111827',
    strokeWidth: 4,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return {
    id: createElementId(),
    type: 'stroke',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points,
    stroke: '#111827',
    strokeWidth: 4,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
};

export const createNoteElement = (point: ScenePoint): NoteElement => ({
  id: createElementId(),
  type: 'note',
  x: point.x,
  y: point.y,
  width: 260,
  height: 180,
  text: 'New note',
  fill: '#fef08a',
  textColor: '#1f2937',
  createdAt: nowIso(),
  updatedAt: nowIso(),
});

export const updateNoteElementText = (
  element: NoteElement,
  text: string,
): NoteElement => ({
  ...element,
  text,
  updatedAt: nowIso(),
});

export const createImageElement = (
  src: string,
  width: number,
  height: number,
): ImageElement => ({
  id: createElementId(),
  type: 'image',
  x: SCENE_WIDTH / 2 - width / 2,
  y: SCENE_HEIGHT / 2 - height / 2,
  width,
  height,
  src,
  alt: 'Whiteboard image',
  createdAt: nowIso(),
  updatedAt: nowIso(),
});
