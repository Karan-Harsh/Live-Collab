'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/error';
import { updateDocument, deleteDocument } from '@/services/document-service';
import { disconnectRealtimeSocket, getRealtimeSocket } from '@/services/realtime-service';

import type { DocumentRecord, RealtimeReceiveChangesPayload } from '@/lib/types';

interface CollaborativeEditorProps {
  document: DocumentRecord;
  accessToken: string;
  currentUserId: string;
}

type ConnectionState = 'connecting' | 'live' | 'offline';
type SyncState = 'idle' | 'syncing' | 'remote-update';

export const CollaborativeEditor = ({
  document,
  accessToken,
  currentUserId,
}: CollaborativeEditorProps) => {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof getRealtimeSocket> | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const suppressBroadcastRef = useRef(true);

  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [isShared, setIsShared] = useState(document.isShared);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState<string | null>(null);
  const canEdit = document.ownerId === currentUserId;

  const updateMutation = useMutation({
    mutationFn: (nextSharedState: boolean) =>
      updateDocument(document.id, {
        isShared: nextSharedState,
      }),
    onSuccess: (updatedDocument) => {
      setIsShared(updatedDocument.isShared);
    },
    onError: (mutationError) => {
      setIsShared(document.isShared);
      setError(getErrorMessage(mutationError));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(document.id),
    onSuccess: () => {
      disconnectRealtimeSocket();
      router.replace('/dashboard');
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
    setIsShared(document.isShared);
    suppressBroadcastRef.current = true;
  }, [document.content, document.isShared, document.title]);

  useEffect(() => {
    const socket = getRealtimeSocket(accessToken);
    socketRef.current = socket;
    setConnectionState('connecting');

    const handleConnect = (): void => {
      setConnectionState('live');
    };

    const handleDisconnect = (): void => {
      setConnectionState('offline');
    };

    const handleReceiveChanges = (payload: RealtimeReceiveChangesPayload): void => {
      if (payload.documentId !== document.id || payload.updatedBy === currentUserId) {
        return;
      }

      suppressBroadcastRef.current = true;

      if (payload.title !== undefined) {
        setTitle(payload.title);
      }

      if (payload.content !== undefined) {
        setContent(payload.content);
      }

      setSyncState('remote-update');
      window.setTimeout(() => setSyncState('idle'), 1000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_changes', handleReceiveChanges);

    socket.connect();
    socket.emit('join_document', { documentId: document.id }, (response) => {
      if ('message' in response) {
        setError(response.message);
        return;
      }

      suppressBroadcastRef.current = true;
      setTitle(response.title);
      setContent(response.content);
      setIsShared(response.isShared);
      setConnectionState('live');
    });

    return () => {
      socket.emit('leave_document', { documentId: document.id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive_changes', handleReceiveChanges);
      socket.disconnect();
      disconnectRealtimeSocket();
    };
  }, [accessToken, currentUserId, document.id]);

  useEffect(() => {
    if (!canEdit) {
      return;
    }

    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false;
      return;
    }

    if (!socketRef.current) {
      return;
    }

    if (broadcastTimerRef.current) {
      window.clearTimeout(broadcastTimerRef.current);
    }

    setSyncState('syncing');
    broadcastTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit(
        'send_changes',
        {
          documentId: document.id,
          changes: {
            type: 'snapshot',
            field: 'document',
          },
          title,
          content,
        },
        (response) => {
          if ('message' in response) {
            setError(response.message);
            setSyncState('idle');
            return;
          }

          setSyncState('idle');
        },
      );
    }, 180);

    return () => {
      if (broadcastTimerRef.current) {
        window.clearTimeout(broadcastTimerRef.current);
      }
    };
  }, [canEdit, content, document.id, title]);

  const connectionTone = useMemo(() => {
    if (connectionState === 'live') {
      return 'border-accent/20 bg-accent/10 text-accent';
    }

    if (connectionState === 'connecting') {
      return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
    }

    return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
  }, [connectionState]);

  const syncLabel =
    syncState === 'syncing'
      ? 'Syncing changes...'
      : syncState === 'remote-update'
        ? 'Updated by a collaborator'
        : 'Live sync ready';

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-panel/80 p-5 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={connectionTone}>
              {connectionState === 'live'
                ? 'Realtime connected'
                : connectionState === 'connecting'
                  ? 'Connecting...'
                  : 'Realtime offline'}
            </Badge>
            <Badge>{syncLabel}</Badge>
            <Badge>{isShared ? 'Shared document' : 'Private document'}</Badge>
          </div>
          <p className="text-sm text-muted">
            Changes broadcast to everyone in this room and persist with a debounced backend sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={isShared}
              disabled={!canEdit || updateMutation.isPending}
              onChange={(event) => {
                const nextSharedState = event.target.checked;
                setIsShared(nextSharedState);
                updateMutation.mutate(nextSharedState);
              }}
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent/50"
            />
            Share with authenticated viewers
          </label>
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
          {canEdit ? (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Delete this document permanently?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-2xl border border-accentSky/20 bg-accentSky/10 px-4 py-3 text-sm text-accentSky">
          You have shared read access to this document. Only the owner can edit, share, or delete
          it.
        </div>
      ) : null}

      <div className="grid gap-5 rounded-[32px] border border-white/10 bg-panelSoft/80 p-5 backdrop-blur">
        <div className="grid gap-3">
          <label className="text-sm font-medium text-muted">Document title</label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="text-lg font-semibold"
            readOnly={!canEdit}
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium text-muted">Editor</label>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[62vh] resize-none font-mono text-[15px] leading-7"
            placeholder="Start typing to collaborate in real time..."
            readOnly={!canEdit}
          />
        </div>
      </div>
    </div>
  );
};
