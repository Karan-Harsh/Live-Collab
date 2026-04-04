import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { WhiteboardRecord } from '@/lib/types';

interface WhiteboardCardProps {
  whiteboard: WhiteboardRecord;
  canManage: boolean;
  onDelete: (whiteboardId: string) => void;
  deletingWhiteboardId: string | null;
}

export const WhiteboardCard = ({
  whiteboard,
  canManage,
  onDelete,
  deletingWhiteboardId,
}: WhiteboardCardProps) => {
  return (
    <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.88),rgba(8,8,8,0.8))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_24%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[80%]">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              {whiteboard.title}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-400">
              {whiteboard.content ||
                'No board content yet. Open the workspace to start shaping ideas.'}
            </p>
          </div>
          <Badge className="border-white/10 bg-white/[0.06] text-white/70">
            {whiteboard.accessRole === 'owner' ? 'Owner' : 'Collaborator'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Collaborators
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{whiteboard.collaborators.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{whiteboard.pendingInvites.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Owner {whiteboard.owner.name}</span>
          <span>Created {new Date(whiteboard.createdAt).toLocaleDateString()}</span>
          <span>Updated {new Date(whiteboard.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3">
        <Link href={`/whiteboards/${whiteboard.id}`} className="inline-flex">
          <Button className="min-w-[132px]">Open board</Button>
        </Link>
        {canManage ? (
          <Button
            variant="ghost"
            className="text-white/70 hover:bg-white/[0.06] hover:text-white"
            onClick={() => onDelete(whiteboard.id)}
            disabled={deletingWhiteboardId === whiteboard.id}
          >
            {deletingWhiteboardId === whiteboard.id ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Invited collaborator</span>
        )}
      </div>
    </article>
  );
};
