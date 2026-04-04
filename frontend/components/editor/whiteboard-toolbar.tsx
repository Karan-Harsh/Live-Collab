'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { NoteElement, TextElement, WhiteboardElement, WhiteboardTool } from '@/lib/whiteboard-scene';

interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  canEdit: boolean;
  zoom: number;
  selectedElements: WhiteboardElement[];
  onToolChange: (tool: WhiteboardTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onDeleteSelected: () => void;
  onEditSelectedNote: () => void;
  onUpdateSelectedTextContent: (text: string) => void;
  onUploadImage: () => void;
  onDuplicateSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

const toolItems: Array<{ id: WhiteboardTool; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'hand', label: 'Hand' },
  { id: 'draw', label: 'Draw' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'note', label: 'Note' },
  { id: 'text', label: 'Text' },
];

const isTextEditableElement = (
  element: WhiteboardElement | null,
): element is NoteElement | TextElement => {
  return element?.type === 'note' || element?.type === 'text';
};

export const WhiteboardToolbar = ({
  tool,
  canEdit,
  zoom,
  selectedElements,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onDeleteSelected,
  onEditSelectedNote,
  onUpdateSelectedTextContent,
  onUploadImage,
  onDuplicateSelected,
  onBringToFront,
  onSendToBack,
}: WhiteboardToolbarProps) => {
  const selectedElement = selectedElements.at(-1) ?? null;
  const editableTextElement = isTextEditableElement(selectedElement) ? selectedElement : null;

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
                ? 'border-white/20 bg-white/[0.12] text-white'
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

      {selectedElements.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {selectedElements.length === 1
              ? `Selected ${selectedElement?.type ?? 'element'}`
              : `${selectedElements.length} selected`}
          </span>
          {selectedElements.length === 1 && selectedElement ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted">
              {Math.round(selectedElement.width)} x {Math.round(selectedElement.height)}
            </span>
          ) : null}
          {selectedElement?.type === 'note' ? (
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
            variant="secondary"
            className="rounded-2xl px-3 py-2"
            disabled={!canEdit}
            onClick={onDuplicateSelected}
          >
            Duplicate
          </Button>
          <Button
            variant="ghost"
            className="rounded-2xl px-3 py-2"
            disabled={!canEdit}
            onClick={onBringToFront}
          >
            Bring front
          </Button>
          <Button
            variant="ghost"
            className="rounded-2xl px-3 py-2"
            disabled={!canEdit}
            onClick={onSendToBack}
          >
            Send back
          </Button>
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
          Select one or more elements to move, reorder, duplicate, or delete them.
        </div>
      )}

      {editableTextElement ? (
        <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              {editableTextElement.type === 'note' ? 'Note content' : 'Text content'}
            </p>
            <p className="text-sm text-white/70">
              Edit the selected {editableTextElement.type} block directly here. Changes sync to collaborators automatically.
            </p>
          </div>
          <Textarea
            value={editableTextElement.text}
            disabled={!canEdit}
            className="min-h-[140px] border-white/10 bg-black/20 text-white placeholder:text-white/40"
            onChange={(event) => onUpdateSelectedTextContent(event.target.value)}
            placeholder={editableTextElement.type === 'note' ? 'Write your note...' : 'Write text...'}
          />
        </div>
      ) : null}
    </div>
  );
};
