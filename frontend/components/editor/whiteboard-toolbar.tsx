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

const toolItems: Array<{ id: WhiteboardTool; label: string; short: string; keyHint: string }> = [
  { id: 'select', label: 'Select', short: 'Select', keyHint: 'V' },
  { id: 'hand', label: 'Hand', short: 'Hand', keyHint: 'H' },
  { id: 'draw', label: 'Draw', short: 'Draw', keyHint: 'D' },
  { id: 'rectangle', label: 'Rectangle', short: 'Rect', keyHint: 'R' },
  { id: 'ellipse', label: 'Ellipse', short: 'Ellipse', keyHint: 'O' },
  { id: 'arrow', label: 'Arrow', short: 'Arrow', keyHint: 'A' },
  { id: 'note', label: 'Note', short: 'Note', keyHint: 'N' },
  { id: 'text', label: 'Text', short: 'Text', keyHint: 'T' },
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
    <div className="flex items-start gap-3">
      <div className="flex w-[176px] flex-col gap-3 rounded-[28px] border border-white/12 bg-[#080808] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Tools
          </p>
          <div className="grid grid-cols-1 gap-2">
        {toolItems.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.label} (${item.keyHint})`}
            aria-label={`${item.label} tool`}
            disabled={!canEdit && item.id !== 'select' && item.id !== 'hand'}
            onClick={() => onToolChange(item.id)}
            className={cn(
              'flex min-h-[50px] items-center justify-between rounded-[18px] border px-3 py-2 text-left transition',
              item.id === tool
                ? 'border-white/20 bg-white/[0.14] text-white'
                : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
              !canEdit && item.id !== 'select' && item.id !== 'hand' ? 'cursor-not-allowed opacity-40' : '',
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.short}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
              {item.keyHint}
            </span>
          </button>
        ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-3">
          <Button
            variant="secondary"
            disabled={!canEdit}
            className="h-11 w-full rounded-[18px] px-0 text-xs uppercase tracking-[0.18em]"
            onClick={onUploadImage}
          >
            Insert image
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="ghost" className="h-10 rounded-[16px] px-0" onClick={onZoomOut}>
              -
            </Button>
            <div className="flex h-10 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03] text-[11px] font-semibold text-white/70">
              {Math.round(zoom * 100)}%
            </div>
            <Button variant="ghost" className="h-10 rounded-[16px] px-0" onClick={onZoomIn}>
              +
            </Button>
          </div>
          <Button
            variant="ghost"
            className="h-10 w-full rounded-[16px] px-0 text-[11px] uppercase tracking-[0.18em]"
            onClick={onResetView}
          >
            Reset
          </Button>
        </div>
      </div>

      {selectedElements.length > 0 || editableTextElement ? (
        <div className="w-[300px] space-y-3 rounded-[28px] border border-white/12 bg-[#080808] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              Selection
            </p>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm font-medium text-white">
                {selectedElements.length === 1
                  ? selectedElement?.type === 'text'
                    ? 'Text block'
                    : selectedElement?.type === 'note'
                      ? 'Sticky note'
                      : selectedElement?.type === 'rectangle'
                        ? 'Rectangle'
                        : selectedElement?.type === 'ellipse'
                          ? 'Ellipse'
                          : selectedElement?.type === 'arrow'
                            ? 'Arrow'
                            : selectedElement?.type === 'stroke'
                              ? 'Drawing'
                              : selectedElement?.type === 'image'
                                ? 'Image'
                                : 'Element'
                  : `${selectedElements.length} elements selected`}
              </p>
              {selectedElements.length === 1 && selectedElement ? (
                <p className="mt-1 text-xs text-white/45">
                  {Math.round(selectedElement.width)} x {Math.round(selectedElement.height)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-white/45">
                  Move, reorder, duplicate, or remove this selection.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {selectedElement?.type === 'note' ? (
              <Button
                variant="secondary"
                className="rounded-[18px] px-3 py-2.5"
                disabled={!canEdit}
                onClick={onEditSelectedNote}
              >
                Edit
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="rounded-[18px] px-3 py-2.5"
              disabled={!canEdit}
              onClick={onDuplicateSelected}
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              className="rounded-[18px] px-3 py-2.5"
              disabled={!canEdit}
              onClick={onBringToFront}
            >
              Front
            </Button>
            <Button
              variant="ghost"
              className="rounded-[18px] px-3 py-2.5"
              disabled={!canEdit}
              onClick={onSendToBack}
            >
              Back
            </Button>
            <Button
              variant="danger"
              className="col-span-2 rounded-[18px] px-3 py-2.5"
              disabled={!canEdit}
              onClick={onDeleteSelected}
            >
              Delete
            </Button>
          </div>

          {editableTextElement ? (
            <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  {editableTextElement.type === 'note' ? 'Note content' : 'Text content'}
                </p>
                <p className="text-xs leading-5 text-white/55">
                  Edit the selected block here. Changes sync automatically.
                </p>
              </div>
              <Textarea
                value={editableTextElement.text}
                disabled={!canEdit}
                className="min-h-[130px] rounded-[18px] border-white/10 bg-black/20 text-white placeholder:text-white/35"
                onChange={(event) => onUpdateSelectedTextContent(event.target.value)}
                placeholder={editableTextElement.type === 'note' ? 'Write your note...' : 'Write text...'}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
