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
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-panelSoft/80 p-5 backdrop-blur">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{whiteboard.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
              {whiteboard.content || 'No board content yet. Open the workspace to start shaping ideas.'}
            </p>
          </div>
          <Badge className="border-accent/20 bg-accent/10 text-accent">
            {whiteboard.accessRole === 'owner' ? 'Owner' : 'Collaborator'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span>{whiteboard.collaborators.length} collaborators</span>
          {whiteboard.pendingInvites.length > 0 ? (
            <span>{whiteboard.pendingInvites.length} pending invites</span>
          ) : null}
          <span>Owner {whiteboard.owner.name}</span>
          <span>Created {new Date(whiteboard.createdAt).toLocaleDateString()}</span>
          <span>Updated {new Date(whiteboard.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href={`/whiteboards/${whiteboard.id}`} className="inline-flex">
          <Button className="min-w-[116px]">Open board</Button>
        </Link>
        {canManage ? (
          <Button
            variant="ghost"
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => onDelete(whiteboard.id)}
            disabled={deletingWhiteboardId === whiteboard.id}
          >
            {deletingWhiteboardId === whiteboard.id ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <span className="text-xs text-muted">Invited collaborator</span>
        )}
      </div>
    </article>
  );
};
