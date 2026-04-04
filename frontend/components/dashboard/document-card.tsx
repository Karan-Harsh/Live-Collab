import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { DocumentRecord } from '@/lib/types';

interface DocumentCardProps {
  document: DocumentRecord;
  canManage: boolean;
  onDelete: (documentId: string) => void;
  deletingDocumentId: string | null;
}

export const DocumentCard = ({
  document,
  canManage,
  onDelete,
  deletingDocumentId,
}: DocumentCardProps) => {
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-white/10 bg-panelSoft/80 p-5 backdrop-blur">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{document.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
              {document.content || 'No content yet. Open the editor to start writing.'}
            </p>
          </div>
          <Badge className={document.isShared ? 'text-accent border-accent/20 bg-accent/10' : ''}>
            {document.isShared ? 'Shared' : 'Private'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span>Created {new Date(document.createdAt).toLocaleDateString()}</span>
          <span>Updated {new Date(document.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href={`/documents/${document.id}`} className="inline-flex">
          <Button className="min-w-[116px]">Open editor</Button>
        </Link>
        {canManage ? (
          <Button
            variant="ghost"
            className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => onDelete(document.id)}
            disabled={deletingDocumentId === document.id}
          >
            {deletingDocumentId === document.id ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <span className="text-xs text-muted">Shared access</span>
        )}
      </div>
    </article>
  );
};
