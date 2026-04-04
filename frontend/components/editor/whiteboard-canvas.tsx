'use client';

import { useEffect, useRef, useState } from 'react';

import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  buildStrokePath,
  clampViewportZoom,
  createArrowElement,
  createNoteElement,
  createShapeElement,
  createStrokeElement,
  createTextElement,
  getElementBounds,
  getTopmostElementAtPoint,
  isElementResizable,
  removeElements,
  resizeElement,
  translateElement,
  upsertElement,
} from '@/lib/whiteboard-scene';

import type {
  ArrowElement,
  EllipseElement,
  RectangleElement,
  ResizeHandle,
  ScenePoint,
  TextElement,
  ViewportState,
  WhiteboardElement,
  WhiteboardScene,
  WhiteboardTool,
} from '@/lib/whiteboard-scene';
import type {
  PointerEvent as ReactPointerEvent,
  ReactElement,
  WheelEvent as ReactWheelEvent,
} from 'react';

interface WhiteboardCanvasProps {
  scene: WhiteboardScene;
  canEdit: boolean;
  tool: WhiteboardTool;
  selectedElementIds: string[];
  remoteCursors: Array<{
    userId: string;
    name: string;
    color: string;
    x: number;
    y: number;
  }>;
  viewport: ViewportState;
  onSceneChange: (scene: WhiteboardScene) => void;
  onSelectElements: (elementIds: string[]) => void;
  onViewportChange: (viewport: ViewportState) => void;
  onElementDoubleClick: (element: WhiteboardElement) => void;
  onCursorActivity: (point: ScenePoint | null) => void;
}

type DraftState =
  | {
      kind: 'shape';
      tool: 'rectangle' | 'ellipse' | 'arrow';
      start: ScenePoint;
      current: ScenePoint;
    }
  | {
      kind: 'stroke';
      points: ScenePoint[];
    }
  | {
      kind: 'move';
      elementIds: string[];
      pointer: ScenePoint;
    }
  | {
      kind: 'resize';
      elementId: string;
      pointer: ScenePoint;
      handle: ResizeHandle;
      origin: WhiteboardElement;
    }
  | {
      kind: 'pan';
      clientX: number;
      clientY: number;
      viewport: ViewportState;
    }
  | null;

const isFormElementFocused = (): boolean => {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
};

const roundPoint = (point: ScenePoint): ScenePoint => ({
  x: Math.round(point.x),
  y: Math.round(point.y),
});

const resizeHandles: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];

const getResizeHandlePosition = (
  bounds: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
): ScenePoint => {
  switch (handle) {
    case 'nw':
      return { x: bounds.x, y: bounds.y };
    case 'ne':
      return { x: bounds.x + bounds.width, y: bounds.y };
    case 'se':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case 'sw':
      return { x: bounds.x, y: bounds.y + bounds.height };
    default:
      return { x: bounds.x, y: bounds.y };
  }
};

const getResizeHandleFromTarget = (target: EventTarget | null): ResizeHandle | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const resizeHandleValue = target.closest('[data-resize-handle]')?.getAttribute('data-resize-handle');

  if (
    resizeHandleValue === 'nw' ||
    resizeHandleValue === 'ne' ||
    resizeHandleValue === 'se' ||
    resizeHandleValue === 'sw'
  ) {
    return resizeHandleValue;
  }

  return null;
};

const buildArrowHeadPoints = (element: ArrowElement): string => {
  const angle = Math.atan2(element.end.y - element.start.y, element.end.x - element.start.x);
  const arrowHeadLength = 18;
  const arrowHeadSpread = Math.PI / 7;
  const leftX = element.end.x - arrowHeadLength * Math.cos(angle - arrowHeadSpread);
  const leftY = element.end.y - arrowHeadLength * Math.sin(angle - arrowHeadSpread);
  const rightX = element.end.x - arrowHeadLength * Math.cos(angle + arrowHeadSpread);
  const rightY = element.end.y - arrowHeadLength * Math.sin(angle + arrowHeadSpread);

  return `${element.end.x},${element.end.y} ${leftX},${leftY} ${rightX},${rightY}`;
};

const renderTextBlock = (element: TextElement): ReactElement => (
  <foreignObject x={element.x} y={element.y} width={element.width} height={element.height}>
    <div className="flex h-full w-full items-start">
      <p
        className="whitespace-pre-wrap break-words"
        style={{
          color: element.textColor,
          fontSize: `${element.fontSize}px`,
          fontFamily: element.fontFamily,
          lineHeight: 1.2,
        }}
      >
        {element.text}
      </p>
    </div>
  </foreignObject>
);

const renderElement = (
  element: WhiteboardElement,
  isSelected: boolean,
): ReactElement => {
  const selectionBounds = getElementBounds(element);

  return (
    <g key={element.id}>
      {element.type === 'rectangle' ? (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={26}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      ) : null}

      {element.type === 'ellipse' ? (
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          rx={element.width / 2}
          ry={element.height / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      ) : null}

      {element.type === 'arrow' ? (
        <>
          <line
            x1={element.start.x}
            y1={element.start.y}
            x2={element.end.x}
            y2={element.end.y}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            strokeLinecap="round"
          />
          <polygon points={buildArrowHeadPoints(element)} fill={element.stroke} />
        </>
      ) : null}

      {element.type === 'stroke' ? (
        <path
          d={buildStrokePath(element.points)}
          fill="none"
          stroke={element.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={element.strokeWidth}
        />
      ) : null}

      {element.type === 'image' ? (
        <>
          <rect
            x={element.x - 8}
            y={element.y - 8}
            width={element.width + 16}
            height={element.height + 16}
            rx={28}
            fill="rgba(15,23,42,0.08)"
          />
          <image
            href={element.src}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : null}

      {element.type === 'note' ? (
        <foreignObject x={element.x} y={element.y} width={element.width} height={element.height}>
          <div className="flex h-full w-full rounded-[28px] border border-black/15 bg-[#f1f1f1] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <p
              className="whitespace-pre-wrap text-sm font-medium leading-6"
              style={{ color: element.textColor }}
            >
              {element.text}
            </p>
          </div>
        </foreignObject>
      ) : null}

      {element.type === 'text' ? renderTextBlock(element) : null}

      {isSelected ? (
        <>
          <rect
            x={selectionBounds.x - 8}
            y={selectionBounds.y - 8}
            width={selectionBounds.width + 16}
            height={selectionBounds.height + 16}
            rx={20}
            fill="none"
            stroke="#f5f5f5"
            strokeDasharray="10 8"
            strokeWidth={3}
            pointerEvents="none"
          />
          {isElementResizable(element)
            ? resizeHandles.map((handle) => {
                const handlePosition = getResizeHandlePosition(selectionBounds, handle);

                return (
                  <g key={`${element.id}-${handle}`}>
                    <circle
                      cx={handlePosition.x}
                      cy={handlePosition.y}
                      r={14}
                      fill="transparent"
                      data-resize-handle={handle}
                    />
                    <circle
                      cx={handlePosition.x}
                      cy={handlePosition.y}
                      r={7}
                      fill="#f8fafc"
                      stroke="#111111"
                      strokeWidth={3}
                      data-resize-handle={handle}
                    />
                  </g>
                );
              })
            : null}
        </>
      ) : null}
    </g>
  );
};

export const WhiteboardCanvas = ({
  scene,
  canEdit,
  tool,
  selectedElementIds,
  remoteCursors,
  viewport,
  onSceneChange,
  onSelectElements,
  onViewportChange,
  onElementDoubleClick,
  onCursorActivity,
}: WhiteboardCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: 1200,
    height: 860,
  });
  const [draft, setDraft] = useState<DraftState>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextEntry = entries[0];

      if (!nextEntry) {
        return;
      }

      setCanvasSize({
        width: Math.max(Math.round(nextEntry.contentRect.width), 480),
        height: Math.max(Math.round(nextEntry.contentRect.height), 420),
      });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!canEdit || selectedElementIds.length === 0 || isFormElementFocused()) {
        return;
      }

      if (event.key !== 'Backspace' && event.key !== 'Delete') {
        return;
      }

      event.preventDefault();
      onSceneChange(removeElements(scene, selectedElementIds));
      onSelectElements([]);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canEdit, onSceneChange, onSelectElements, scene, selectedElementIds]);

  const getScenePoint = (
    clientX: number,
    clientY: number,
  ): { point: ScenePoint; rect: DOMRect } | null => {
    if (!containerRef.current) {
      return null;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const baseX = rect.width / 2 + viewport.x - (SCENE_WIDTH * viewport.zoom) / 2;
    const baseY = rect.height / 2 + viewport.y - (SCENE_HEIGHT * viewport.zoom) / 2;
    const x = (clientX - rect.left - baseX) / viewport.zoom;
    const y = (clientY - rect.top - baseY) / viewport.zoom;

    return {
      point: { x, y },
      rect,
    };
  };

  const commitDraftShape = (
    activeDraft: Exclude<DraftState, null>,
  ): RectangleElement | EllipseElement | ArrowElement | ReturnType<typeof createStrokeElement> | null => {
    if (activeDraft.kind === 'shape') {
      if (activeDraft.tool === 'arrow') {
        return createArrowElement(activeDraft.start, activeDraft.current);
      }

      return createShapeElement(activeDraft.tool, activeDraft.start, activeDraft.current);
    }

    if (activeDraft.kind === 'stroke') {
      if (activeDraft.points.length < 2) {
        return null;
      }

      return createStrokeElement(activeDraft.points);
    }

    return null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const pointResult = getScenePoint(event.clientX, event.clientY);

    if (!pointResult) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const point = roundPoint(pointResult.point);
    onCursorActivity(point);
    const hitElement = getTopmostElementAtPoint(scene, point);
    const resizeHandle = getResizeHandleFromTarget(event.target);

    if (tool === 'hand') {
      setDraft({
        kind: 'pan',
        clientX: event.clientX,
        clientY: event.clientY,
        viewport,
      });
      return;
    }

    if (tool === 'select') {
      const selectionSet = new Set(selectedElementIds);

      if (
        resizeHandle &&
        selectedElementIds.length === 1 &&
        canEdit &&
        selectedElementIds[0] === hitElement?.id
      ) {
        const selectedElement = scene.elements.find((element) => element.id === selectedElementIds[0]);

        if (selectedElement && isElementResizable(selectedElement)) {
          setDraft({
            kind: 'resize',
            elementId: selectedElement.id,
            pointer: point,
            handle: resizeHandle,
            origin: selectedElement,
          });
          return;
        }
      }

      if (event.shiftKey) {
        if (hitElement) {
          const nextSelection = selectionSet.has(hitElement.id)
            ? selectedElementIds.filter((elementId) => elementId !== hitElement.id)
            : [...selectedElementIds, hitElement.id];

          onSelectElements(nextSelection);
        }

        return;
      }

      if (!hitElement) {
        onSelectElements([]);
        return;
      }

      const nextSelection = selectionSet.has(hitElement.id) ? selectedElementIds : [hitElement.id];
      onSelectElements(nextSelection);

      if (canEdit) {
        setDraft({
          kind: 'move',
          elementIds: nextSelection,
          pointer: point,
        });
      }

      return;
    }

    if (!canEdit) {
      return;
    }

    if (tool === 'note') {
      const note = createNoteElement(point);
      onSceneChange(upsertElement(scene, note));
      onSelectElements([note.id]);
      return;
    }

    if (tool === 'text') {
      const textElement = createTextElement(point);
      onSceneChange(upsertElement(scene, textElement));
      onSelectElements([textElement.id]);
      return;
    }

    if (tool === 'draw') {
      setDraft({
        kind: 'stroke',
        points: [point],
      });
      return;
    }

    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'arrow') {
      setDraft({
        kind: 'shape',
        tool,
        start: point,
        current: point,
      });
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const pointResult = getScenePoint(event.clientX, event.clientY);

    if (!pointResult) {
      return;
    }

    const point = roundPoint(pointResult.point);
    onCursorActivity(point);

    if (!draft) {
      return;
    }

    if (draft.kind === 'pan') {
      onViewportChange({
        ...draft.viewport,
        x: draft.viewport.x + (event.clientX - draft.clientX),
        y: draft.viewport.y + (event.clientY - draft.clientY),
      });
      return;
    }

    if (draft.kind === 'shape') {
      setDraft({
        ...draft,
        current: point,
      });
      return;
    }

    if (draft.kind === 'stroke') {
      const lastPoint = draft.points[draft.points.length - 1];

      if (lastPoint && Math.abs(lastPoint.x - point.x) < 2 && Math.abs(lastPoint.y - point.y) < 2) {
        return;
      }

      setDraft({
        kind: 'stroke',
        points: [...draft.points, point],
      });
      return;
    }

    if (draft.kind === 'move' && canEdit) {
      const deltaX = point.x - draft.pointer.x;
      const deltaY = point.y - draft.pointer.y;
      const selectionSet = new Set(draft.elementIds);

      onSceneChange({
        ...scene,
        elements: scene.elements.map((element) =>
          selectionSet.has(element.id) ? translateElement(element, deltaX, deltaY) : element,
        ),
      });
      setDraft({
        kind: 'move',
        elementIds: draft.elementIds,
        pointer: point,
      });
      return;
    }

    if (draft.kind === 'resize' && canEdit) {
      const deltaX = point.x - draft.pointer.x;
      const deltaY = point.y - draft.pointer.y;

      onSceneChange(upsertElement(scene, resizeElement(draft.origin, draft.handle, deltaX, deltaY)));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!draft) {
      return;
    }

    const committedElement = commitDraftShape(draft);

    if (committedElement) {
      onSceneChange(upsertElement(scene, committedElement));
      onSelectElements([committedElement.id]);
    }

    setDraft(null);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>): void => {
    onCursorActivity(null);
    handlePointerUp(event);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    if (!event.metaKey && !event.ctrlKey) {
      return;
    }

    event.preventDefault();
    const nextZoom = clampViewportZoom(viewport.zoom - event.deltaY * 0.0012);
    onViewportChange({
      ...viewport,
      zoom: nextZoom,
    });
  };

  const selectedElements = scene.elements.filter((element) => selectedElementIds.includes(element.id));

  const previewElement =
    draft?.kind === 'shape'
      ? draft.tool === 'arrow'
        ? createArrowElement(draft.start, draft.current)
        : createShapeElement(draft.tool, draft.start, draft.current)
      : draft?.kind === 'stroke'
        ? createStrokeElement(draft.points)
        : null;

  const draftScene = previewElement
    ? {
        ...scene,
        elements: [...scene.elements, previewElement],
      }
    : scene;

  const renderWidth = canvasSize.width;
  const renderHeight = canvasSize.height;
  const transformX = renderWidth / 2 + viewport.x - (SCENE_WIDTH * viewport.zoom) / 2;
  const transformY = renderHeight / 2 + viewport.y - (SCENE_HEIGHT * viewport.zoom) / 2;

  return (
    <div
      ref={containerRef}
      className="relative h-[80vh] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.98),rgba(6,6,6,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.4)]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
    >
      <svg className="h-full w-full" viewBox={`0 0 ${renderWidth} ${renderHeight}`} role="img">
        <defs>
          <pattern id="whiteboard-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={renderWidth} height={renderHeight} fill="rgba(255,255,255,0.03)" />

        <g transform={`translate(${transformX} ${transformY}) scale(${viewport.zoom})`}>
          <rect
            x="0"
            y="0"
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            rx="44"
            fill={scene.background}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <rect
            x="0"
            y="0"
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            rx="44"
            fill="url(#whiteboard-grid)"
          />

          {draftScene.elements.map((element) =>
            renderElement(element, selectedElements.some((selectedElement) => selectedElement.id === element.id)),
          )}

          {remoteCursors.map((cursor) => (
            <g key={cursor.userId} transform={`translate(${cursor.x} ${cursor.y})`}>
              <circle cx="0" cy="0" r="11" fill={cursor.color} fillOpacity="0.2" />
              <circle cx="0" cy="0" r="5.5" fill={cursor.color} />
              <line x1="0" y1="0" x2="0" y2="30" stroke={cursor.color} strokeWidth="3" strokeLinecap="round" />
              <g transform="translate(16 -12)">
                <rect
                  x="0"
                  y="0"
                  rx="14"
                  ry="14"
                  width={Math.max(cursor.name.length * 8.4 + 20, 72)}
                  height="28"
                  fill="rgba(12,12,12,0.96)"
                  stroke={cursor.color}
                  strokeWidth="1.5"
                />
                <text
                  x="10"
                  y="18"
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="700"
                  style={{ letterSpacing: '0.02em' }}
                >
                  {cursor.name}
                </text>
              </g>
            </g>
          ))}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
        {tool === 'hand'
          ? 'Hand tool active'
          : tool === 'select'
            ? 'Select, shift-select, and drag elements'
            : tool === 'draw'
              ? 'Freehand drawing'
              : tool === 'note'
                ? 'Click to drop a note'
                : tool === 'text'
                  ? 'Click to place a text block'
                  : tool === 'arrow'
                    ? 'Drag to connect with an arrow'
                    : 'Drag to place a shape'}
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
        Hold `Shift` to multi-select, or `Ctrl` / `Cmd` and scroll to zoom
      </div>

      {selectedElements.length === 1 &&
      (selectedElements[0]?.type === 'note' || selectedElements[0]?.type === 'text') ? (
        <button
          type="button"
          className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/15"
          onClick={() => onElementDoubleClick(selectedElements[0])}
        >
          Edit selected {selectedElements[0].type}
        </button>
      ) : null}
    </div>
  );
};
