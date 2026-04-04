'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { WhiteboardElement, WhiteboardTool } from '@/lib/whiteboard-scene';

interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  canEdit: boolean;
  zoom: number;
  selectedElement: WhiteboardElement | null;
  onToolChange: (tool: WhiteboardTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onDeleteSelected: () => void;
  onEditSelectedNote: () => void;
  onUploadImage: () => void;
}

const toolItems: Array<{ id: WhiteboardTool; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'hand', label: 'Hand' },
  { id: 'draw', label: 'Draw' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'note', label: 'Note' },
];

export const WhiteboardToolbar = ({
  tool,
  canEdit,
  zoom,
  selectedElement,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onDeleteSelected,
  onEditSelectedNote,
  onUploadImage,
}: WhiteboardToolbarProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#07131d]/90 p-4 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {toolItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!canEdit && item.id !== 'select' && item.id !== 'hand'}
            onClick={() => onToolChange(item.id)}
            className={cn(
              'rounded-2xl border px-3 py-2 text-sm font-semibold transition',
              item.id === tool
                ? 'border-accent/50 bg-accent/15 text-accent'
                : 'border-white/10 bg-white/5 text-muted hover:border-white/20 hover:bg-white/10 hover:text-white',
              !canEdit && item.id !== 'select' && item.id !== 'hand' ? 'cursor-not-allowed opacity-40' : '',
            )}
          >
            {item.label}
          </button>
        ))}
        <Button
          variant="secondary"
          disabled={!canEdit}
          className="rounded-2xl px-3 py-2"
          onClick={onUploadImage}
        >
          Image
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" className="rounded-2xl px-3 py-2" onClick={onZoomOut}>
          Zoom -
        </Button>
        <Button variant="ghost" className="rounded-2xl px-3 py-2" onClick={onZoomIn}>
          Zoom +
        </Button>
        <Button variant="ghost" className="rounded-2xl px-3 py-2" onClick={onResetView}>
          Reset view
        </Button>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {selectedElement ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Selected {selectedElement.type}
          </span>
          {selectedElement.type === 'note' ? (
            <Button
              variant="secondary"
              className="rounded-2xl px-3 py-2"
              disabled={!canEdit}
              onClick={onEditSelectedNote}
            >
              Edit note
            </Button>
          ) : null}
          <Button
            variant="danger"
            className="rounded-2xl px-3 py-2"
            disabled={!canEdit}
            onClick={onDeleteSelected}
          >
            Delete
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-muted">
          Select an element to move it or remove it from the board.
        </div>
      )}
    </div>
  );
};
