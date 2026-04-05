'use client';

import { CaptureUpdateAction, Excalidraw } from '@excalidraw/excalidraw';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CollaborationPanel } from '@/components/editor/collaboration-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';
import {
  getDefaultExcalidrawAppState,
  parseStoredExcalidrawScene,
  serializeStoredExcalidrawScene,
} from '@/lib/excalidraw-scene';
import { disconnectRealtimeSocket, getRealtimeSocket } from '@/services/realtime-service';
import { createInvitation } from '@/services/invitation-service';
import { createWhiteboard, deleteWhiteboard } from '@/services/whiteboard-service';

import type {
  RealtimeCursorPresenceClearedPayload,
  RealtimeCursorPresencePayload,
  RealtimePresenceUpdatedPayload,
  RealtimeReceiveChangesPayload,
  WhiteboardRecord,
} from '@/lib/types';
import type {
  AppState as ExcalidrawAppState,
  BinaryFiles,
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

interface CollaborativeEditorProps {
  whiteboard: WhiteboardRecord;
  accessToken: string;
  currentUserId: string;
}

interface ExcalidrawSceneSnapshot {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<ExcalidrawAppState>;
  files: BinaryFiles;
}

type ConnectionState = 'connecting' | 'live' | 'offline';
type SyncState = 'idle' | 'syncing' | 'remote-update';

const cursorPalette = ['#f5f5f5', '#d4d4d4', '#a3a3a3', '#737373', '#e5e5e5', '#bfbfbf'];

const getCursorColor = (userId: string): string => {
  const total = Array.from(userId).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return cursorPalette[total % cursorPalette.length] ?? '#f5f5f5';
};

export const CollaborativeEditor = ({
  whiteboard,
  accessToken,
  currentUserId,
}: CollaborativeEditorProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<ReturnType<typeof getRealtimeSocket> | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const cursorBroadcastTimerRef = useRef<number | null>(null);
  const suppressBroadcastRef = useRef(true);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const currentSceneRef = useRef<ExcalidrawSceneSnapshot>(
    parseStoredExcalidrawScene(whiteboard.content),
  );
  const collaboratorsRef = useRef<Map<SocketId, Collaborator>>(new Map());
  const currentTitleRef = useRef(whiteboard.title);
  const lastBroadcastSceneRef = useRef(whiteboard.content);
  const lastBroadcastTitleRef = useRef(whiteboard.title);

  const [title, setTitle] = useState(whiteboard.title);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [activeUserIds, setActiveUserIds] = useState<string[]>([currentUserId]);
  const [remoteCursors, setRemoteCursors] = useState<RealtimeCursorPresencePayload[]>([]);
  const [isCollaborationPanelOpen, setIsCollaborationPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = whiteboard.permissions.canEdit;
  const canDelete = whiteboard.permissions.canDelete;
  const canInvite = whiteboard.permissions.canInvite;

  const inviteMutation = useMutation({
    mutationFn: (email: string) => createInvitation(whiteboard.id, email),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['whiteboard', whiteboard.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['invitations'],
        }),
      ]);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
      throw mutationError;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWhiteboard(whiteboard.id),
    onSuccess: () => {
      disconnectRealtimeSocket();
      router.replace('/dashboard');
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () =>
      createWhiteboard({
        title: `${currentTitleRef.current} copy`,
        content: serializeStoredExcalidrawScene(
          currentSceneRef.current.elements,
          currentSceneRef.current.appState,
          currentSceneRef.current.files,
        ),
      }),
    onSuccess: async (createdWhiteboard) => {
      await queryClient.invalidateQueries({
        queryKey: ['whiteboards'],
      });
      router.push(`/whiteboards/${createdWhiteboard.id}`);
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError));
    },
  });

  const knownUsers = useMemo(() => {
    return [whiteboard.owner, ...whiteboard.collaborators.map((collaborator) => collaborator.user)];
  }, [whiteboard.collaborators, whiteboard.owner]);

  const userMap = useMemo(() => {
    return new Map(knownUsers.map((user) => [user.id, user]));
  }, [knownUsers]);

  const activeCollaborators = useMemo(() => {
    return activeUserIds
      .map((userId) => userMap.get(userId))
      .filter((user): user is (typeof knownUsers)[number] => Boolean(user));
  }, [activeUserIds, knownUsers, userMap]);

  const collaborators = useMemo(() => {
    const nextCollaborators = new Map<SocketId, Collaborator>();

    remoteCursors.forEach((cursor) => {
      if (cursor.userId === currentUserId) {
        return;
      }

      const collaborator = userMap.get(cursor.userId);

      nextCollaborators.set(cursor.userId as SocketId, {
        username: collaborator?.name ?? 'Collaborator',
        color: {
          background: getCursorColor(cursor.userId),
          stroke: '#111111',
        },
        pointer: {
          x: cursor.cursor.x,
          y: cursor.cursor.y,
          tool: 'pointer',
          renderCursor: true,
        },
      });
    });

    return nextCollaborators;
  }, [currentUserId, remoteCursors, userMap]);

  useEffect(() => {
    collaboratorsRef.current = collaborators;
  }, [collaborators]);

  const connectionMeta = useMemo(() => {
    if (connectionState === 'live') {
      return {
        label: 'Realtime connected',
        dotClassName: 'bg-white',
        textClassName: 'text-white/78',
      };
    }

    if (connectionState === 'connecting') {
      return {
        label: 'Connecting',
        dotClassName: 'bg-white/55',
        textClassName: 'text-white/58',
      };
    }

    return {
      label: 'Offline',
      dotClassName: 'bg-white/30',
      textClassName: 'text-white/45',
    };
  }, [connectionState]);

  const syncLabel =
    syncState === 'syncing'
      ? 'Syncing changes...'
      : syncState === 'remote-update'
        ? 'Updated by collaborator'
        : 'Live sync ready';

  useEffect(() => {
    const nextScene = parseStoredExcalidrawScene(whiteboard.content);

    setTitle(whiteboard.title);
    currentTitleRef.current = whiteboard.title;
    lastBroadcastTitleRef.current = whiteboard.title;
    currentSceneRef.current = nextScene;
    lastBroadcastSceneRef.current = whiteboard.content;
    setActiveUserIds([currentUserId]);
    setRemoteCursors([]);
    suppressBroadcastRef.current = true;

    if (excalidrawApiRef.current) {
      if (Object.values(nextScene.files).length > 0) {
        excalidrawApiRef.current.addFiles(Object.values(nextScene.files));
      }

      excalidrawApiRef.current.updateScene({
        elements: nextScene.elements,
        appState: nextScene.appState as ExcalidrawAppState,
        collaborators: collaboratorsRef.current,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  }, [currentUserId, whiteboard.content, whiteboard.title]);

  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    if (!excalidrawApiRef.current) {
      return;
    }

    excalidrawApiRef.current.updateScene({
      collaborators,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [collaborators]);

  useEffect(() => {
    const socket = getRealtimeSocket(accessToken);
    socketRef.current = socket;
    setConnectionState('connecting');

    const handleConnect = (): void => {
      setConnectionState('live');
    };

    const handleDisconnect = (): void => {
      setConnectionState('offline');
      setActiveUserIds([currentUserId]);
      setRemoteCursors([]);
    };

    const handleReceiveChanges = (payload: RealtimeReceiveChangesPayload): void => {
      if (payload.whiteboardId !== whiteboard.id || payload.updatedBy === currentUserId) {
        return;
      }

      suppressBroadcastRef.current = true;

      if (payload.title !== undefined) {
        setTitle(payload.title);
        currentTitleRef.current = payload.title;
        lastBroadcastTitleRef.current = payload.title;
      }

      if (payload.content !== undefined) {
        const nextScene = parseStoredExcalidrawScene(payload.content);
        currentSceneRef.current = nextScene;
        lastBroadcastSceneRef.current = payload.content;

        if (excalidrawApiRef.current) {
          if (Object.values(nextScene.files).length > 0) {
            excalidrawApiRef.current.addFiles(Object.values(nextScene.files));
          }

          excalidrawApiRef.current.updateScene({
            elements: nextScene.elements,
            appState: nextScene.appState as ExcalidrawAppState,
            collaborators: collaboratorsRef.current,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        }
      }

      setSyncState('remote-update');
      window.setTimeout(() => setSyncState('idle'), 1000);
    };

    const handlePresenceUpdated = (payload: RealtimePresenceUpdatedPayload): void => {
      if (payload.whiteboardId !== whiteboard.id) {
        return;
      }

      setActiveUserIds(payload.activeUserIds);
    };

    const handleCursorPresenceUpdated = (payload: RealtimeCursorPresencePayload): void => {
      if (payload.whiteboardId !== whiteboard.id || payload.userId === currentUserId) {
        return;
      }

      setRemoteCursors((currentCursors) => {
        const nextCursors = currentCursors.filter((cursor) => cursor.userId !== payload.userId);
        nextCursors.push(payload);
        return nextCursors;
      });
    };

    const handleCursorPresenceCleared = (payload: RealtimeCursorPresenceClearedPayload): void => {
      if (payload.whiteboardId !== whiteboard.id) {
        return;
      }

      setRemoteCursors((currentCursors) =>
        currentCursors.filter((cursor) => cursor.userId !== payload.userId),
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_changes', handleReceiveChanges);
    socket.on('presence_updated', handlePresenceUpdated);
    socket.on('cursor_presence_updated', handleCursorPresenceUpdated);
    socket.on('cursor_presence_cleared', handleCursorPresenceCleared);

    socket.connect();
    socket.emit('join_whiteboard', { whiteboardId: whiteboard.id }, (response) => {
      if ('message' in response) {
        setError(response.message);
        return;
      }

      const nextScene = parseStoredExcalidrawScene(response.content);
      suppressBroadcastRef.current = true;
      setTitle(response.title);
      currentTitleRef.current = response.title;
      lastBroadcastTitleRef.current = response.title;
      currentSceneRef.current = nextScene;
      lastBroadcastSceneRef.current = response.content;
      setActiveUserIds(response.activeUserIds);
      setRemoteCursors(response.activeCursors.filter((cursor) => cursor.userId !== currentUserId));
      setConnectionState('live');

      if (excalidrawApiRef.current) {
        if (Object.values(nextScene.files).length > 0) {
          excalidrawApiRef.current.addFiles(Object.values(nextScene.files));
        }

        excalidrawApiRef.current.updateScene({
          elements: nextScene.elements,
          appState: nextScene.appState as ExcalidrawAppState,
          collaborators: collaboratorsRef.current,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    });

    return () => {
      socket.emit('leave_whiteboard', { whiteboardId: whiteboard.id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive_changes', handleReceiveChanges);
      socket.off('presence_updated', handlePresenceUpdated);
      socket.off('cursor_presence_updated', handleCursorPresenceUpdated);
      socket.off('cursor_presence_cleared', handleCursorPresenceCleared);
      socket.disconnect();
      disconnectRealtimeSocket();
    };
  }, [accessToken, currentUserId, whiteboard.id]);

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

    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
    }

    setSyncState('syncing');
    broadcastTimerRef.current = window.setTimeout(() => {
      const nextTitle = currentTitleRef.current;
      const nextContent = serializeStoredExcalidrawScene(
        currentSceneRef.current.elements,
        currentSceneRef.current.appState,
        currentSceneRef.current.files,
      );

      socketRef.current?.emit(
        'send_changes',
        {
          whiteboardId: whiteboard.id,
          changes: {
            kind: 'excalidraw-scene',
            revision: Date.now(),
          },
          title: nextTitle,
          content: nextContent,
        },
        (response) => {
          if ('message' in response) {
            setError(response.message);
            setSyncState('idle');
            return;
          }

          lastBroadcastSceneRef.current = nextContent;
          lastBroadcastTitleRef.current = nextTitle;
          setSyncState('idle');
        },
      );
    }, 220);

    return () => {
      if (broadcastTimerRef.current !== null) {
        window.clearTimeout(broadcastTimerRef.current);
      }
    };
  }, [canEdit, sceneRevision, title, whiteboard.id]);

  const flushCursorPresence = (): void => {
    cursorBroadcastTimerRef.current = null;

    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }

    socketRef.current.emit('update_cursor', {
      whiteboardId: whiteboard.id,
      cursor: pendingCursorRef.current,
    });
  };

  const handleExcalidrawChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: BinaryFiles,
  ): void => {
    currentSceneRef.current = {
      elements,
      appState,
      files,
    };
    setSceneRevision((currentRevision) => currentRevision + 1);
  };

  const handlePointerUpdate = (payload: {
    pointer: {
      x: number;
      y: number;
      tool: 'pointer' | 'laser';
    };
    button: 'down' | 'up';
  }): void => {
    pendingCursorRef.current = {
      x: payload.pointer.x,
      y: payload.pointer.y,
    };

    if (cursorBroadcastTimerRef.current !== null) {
      return;
    }

    cursorBroadcastTimerRef.current = window.setTimeout(flushCursorPresence, 48);
  };

  useEffect(() => {
    return () => {
      if (cursorBroadcastTimerRef.current !== null) {
        window.clearTimeout(cursorBroadcastTimerRef.current);
      }
    };
  }, []);

  const initialScene = useMemo(() => {
    return parseStoredExcalidrawScene(whiteboard.content);
  }, [whiteboard.content]);

  return (
    <div className="relative h-[calc(100vh-0.75rem)] min-h-[760px] overflow-hidden rounded-[34px] border border-white/10 bg-[#0a0a0a] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0">
        <Excalidraw
          key={whiteboard.id}
          excalidrawAPI={(api) => {
            excalidrawApiRef.current = api;
          }}
          initialData={{
            elements: initialScene.elements,
            appState: {
              ...getDefaultExcalidrawAppState(),
              ...initialScene.appState,
            },
            files: initialScene.files,
          }}
          onChange={handleExcalidrawChange}
          onPointerUpdate={handlePointerUpdate}
          isCollaborating
          theme="dark"
          viewModeEnabled={!canEdit}
          UIOptions={{
            tools: {
              image: true,
            },
          }}
          renderTopRightUI={() => (
            <div className="mr-3 mt-3 flex items-center gap-2 rounded-[18px] border border-white/10 bg-[#080808]/92 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <Button
                variant="secondary"
                className="rounded-[14px] px-3 py-2"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
              </Button>
              <Button
                variant="secondary"
                className="rounded-[14px] px-3 py-2"
                onClick={() => setIsCollaborationPanelOpen(true)}
              >
                People
              </Button>
              <Button
                variant="ghost"
                className="rounded-[14px] px-3 py-2"
                onClick={() => router.push('/dashboard')}
              >
                Exit
              </Button>
              {canDelete ? (
                <Button
                  variant="danger"
                  className="rounded-[14px] px-3 py-2"
                  onClick={() => {
                    if (window.confirm('Delete this whiteboard permanently?')) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          )}
        />
      </div>

      <div className="pointer-events-none absolute left-4 top-4 z-20 w-full max-w-[300px]">
        <div className="pointer-events-auto rounded-[22px] border border-white/10 bg-[#080808]/92 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div
            className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${connectionMeta.textClassName}`}
          >
            <span className={`h-2 w-2 rounded-full ${connectionMeta.dotClassName}`} />
            <span>{connectionMeta.label}</span>
            <span className="h-1 w-1 rounded-full bg-white/12" />
            <span>{syncLabel}</span>
          </div>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 h-auto border-none bg-transparent px-0 py-0 text-[1.7rem] font-semibold tracking-[-0.05em] text-white focus:border-none focus:bg-transparent focus:shadow-none"
            readOnly={!canEdit}
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
            <span>{activeCollaborators.length} active</span>
            <span>&bull;</span>
            <span>{whiteboard.accessRole === 'owner' ? 'Owner' : 'Collaborator'}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20">
          <div className="pointer-events-auto max-w-md rounded-[18px] border border-white/10 bg-[#080808]/92 px-4 py-3 text-sm text-white shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            {error}
          </div>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20">
          <div className="pointer-events-auto rounded-[18px] border border-white/10 bg-[#080808]/92 px-4 py-3 text-sm text-white/75 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            View only. You can explore the board, export it, or duplicate it.
          </div>
        </div>
      ) : null}

      {isCollaborationPanelOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCollaborationPanelOpen(false)}
            aria-label="Close collaboration panel"
          />
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[420px] p-3 sm:p-4">
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-[#0c0c0c]/96 px-4 py-3 backdrop-blur">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                    Workspace access
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Invite people and review current access.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setIsCollaborationPanelOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                <CollaborationPanel
                  whiteboard={whiteboard}
                  canInvite={canInvite}
                  isInviting={inviteMutation.isPending}
                  onInvite={inviteMutation.mutateAsync}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
