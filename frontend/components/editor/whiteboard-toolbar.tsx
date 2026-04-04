'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { WhiteboardTool } from '@/lib/whiteboard-scene';

interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  canEdit: boolean;
  zoom: number;
  onToolChange: (tool: WhiteboardTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUploadImage: () => void;
}

const toolItems: Array<{ id: WhiteboardTool; label: string; keyHint: string }> = [
  { id: 'select', label: 'Select', keyHint: 'V' },
  { id: 'hand', label: 'Hand', keyHint: 'H' },
  { id: 'draw', label: 'Draw', keyHint: 'D' },
  { id: 'rectangle', label: 'Rect', keyHint: 'R' },
  { id: 'ellipse', label: 'Ellipse', keyHint: 'O' },
  { id: 'arrow', label: 'Arrow', keyHint: 'A' },
  { id: 'note', label: 'Note', keyHint: 'N' },
  { id: 'text', label: 'Text', keyHint: 'T' },
];

export const WhiteboardToolbar = ({
  tool,
  canEdit,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onUploadImage,
}: WhiteboardToolbarProps) => {
  return (
    <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-[24px] border border-white/12 bg-[#080808] p-2 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
      <div className="flex items-center gap-1.5">
        {toolItems.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.label} (${item.keyHint})`}
            aria-label={`${item.label} tool`}
            disabled={!canEdit && item.id !== 'select' && item.id !== 'hand'}
            onClick={() => onToolChange(item.id)}
            className={cn(
              'flex min-w-[84px] items-center justify-between rounded-[18px] border px-3 py-2 text-left transition',
              item.id === tool
                ? 'border-white/22 bg-white/[0.14] text-white'
                : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
              !canEdit && item.id !== 'select' && item.id !== 'hand' ? 'cursor-not-allowed opacity-40' : '',
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
              {item.keyHint}
            </span>
          </button>
        ))}
      </div>

      <div className="h-8 w-px shrink-0 bg-white/10" />

      <Button
        variant="secondary"
        disabled={!canEdit}
        className="h-10 shrink-0 rounded-[18px] px-4 text-xs uppercase tracking-[0.16em]"
        onClick={onUploadImage}
      >
        Image
      </Button>

      <div className="flex shrink-0 items-center gap-1 rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
        <Button variant="ghost" className="h-9 rounded-[14px] px-3" onClick={onZoomOut}>
          -
        </Button>
        <span className="min-w-[56px] text-center text-[11px] font-semibold text-white/70">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" className="h-9 rounded-[14px] px-3" onClick={onZoomIn}>
          +
        </Button>
      </div>

      <Button
        variant="ghost"
        className="h-10 shrink-0 rounded-[18px] px-4 text-xs uppercase tracking-[0.16em]"
        onClick={onResetView}
      >
        Reset view
      </Button>
    </div>
  );
};
