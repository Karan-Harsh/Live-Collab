'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CollaborationPanel } from '@/components/editor/collaboration-panel';
import { WhiteboardCanvas } from '@/components/editor/whiteboard-canvas';
import { WhiteboardToolbar } from '@/components/editor/whiteboard-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';
import {
  buildSceneSnapshotChangeSummary,
  MAX_IMAGE_UPLOAD_BYTES,
  clampViewportZoom,
  createImageElement,
  duplicateElements,
  isSceneSnapshotChangeSummary,
  mergeScenes,
  parseSceneFromContent,
  reorderElements,
  removeElements,
  serializeScene,
  updateTextElementText,
  upsertElement,
} from '@/lib/whiteboard-scene';
import { disconnectRealtimeSocket, getRealtimeSocket } from '@/services/realtime-service';
import { createInvitation } from '@/services/invitation-service';
import { deleteWhiteboard } from '@/services/whiteboard-service';

import type {
  RealtimeCursorPresenceClearedPayload,
  RealtimeCursorPresencePayload,
  RealtimePresenceUpdatedPayload,
  RealtimeReceiveChangesPayload,
  WhiteboardRecord,
} from '@/lib/types';
import type {
  ImageElement,
  ScenePoint,
  ViewportState,
  WhiteboardElement,
  WhiteboardScene,
  WhiteboardTool,
} from '@/lib/whiteboard-scene';
import type { ChangeEvent } from 'react';

interface CollaborativeEditorProps {
  whiteboard: WhiteboardRecord;
  accessToken: string;
  currentUserId: string;
}

type ConnectionState = 'connecting' | 'live' | 'offline';
type SyncState = 'idle' | 'syncing' | 'remote-update';

const defaultViewport: ViewportState = {
  x: 0,
  y: 0,
  zoom: 0.72,
};

const cursorPalette = ['#5eead4', '#f97316', '#f472b6', '#60a5fa', '#facc15', '#34d399'];

const getCursorColor = (userId: string): string => {
  const total = Array.from(userId).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return cursorPalette[total % cursorPalette.length] ?? '#5eead4';
};

const loadImageFile = async (file: File): Promise<ImageElement> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Image upload failed.'));
    };
    reader.onerror = () => reject(new Error('Image upload failed.'));
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error('Uploaded image could not be processed.'));
    image.src = dataUrl;
  });

  const maxWidth = 560;
  const maxHeight = 420;
  const scale = Math.min(1, maxWidth / dimensions.width, maxHeight / dimensions.height);

  return createImageElement(
    dataUrl,
    Math.max(Math.round(dimensions.width * scale), 120),
    Math.max(Math.round(dimensions.height * scale), 120),
  );
};

export const CollaborativeEditor = ({
  whiteboard,
  accessToken,
  currentUserId,
}: CollaborativeEditorProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const socketRef = useRef<ReturnType<typeof getRealtimeSocket> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const cursorBroadcastTimerRef = useRef<number | null>(null);
  const suppressBroadcastRef = useRef(true);
  const pendingCursorRef = useRef<ScenePoint | null>(null);
  const currentSceneRef = useRef<WhiteboardScene>(parseSceneFromContent(whiteboard.content));
  const lastBroadcastSceneRef = useRef<WhiteboardScene>(parseSceneFromContent(whiteboard.content));
  const currentTitleRef = useRef(whiteboard.title);
  const lastBroadcastTitleRef = useRef(whiteboard.title);

  const [title, setTitle] = useState(whiteboard.title);
  const [scene, setScene] = useState<WhiteboardScene>(() => parseSceneFromContent(whiteboard.content));
  const [tool, setTool] = useState<WhiteboardTool>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [activeUserIds, setActiveUserIds] = useState<string[]>([currentUserId]);
  const [remoteCursors, setRemoteCursors] = useState<RealtimeCursorPresencePayload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canEdit = whiteboard.permissions.canEdit;
  const canDelete = whiteboard.permissions.canDelete;
  const canInvite = whiteboard.permissions.canInvite;
  const selectedElements = scene.elements.filter((element) => selectedElementIds.includes(element.id));
  const selectedElement = selectedElements.at(-1) ?? null;
  const serializedScene = serializeScene(scene);
  const activeCollaborators = useMemo(() => {
    const knownUsers = [whiteboard.owner, ...whiteboard.collaborators.map((collaborator) => collaborator.user)];
    const uniqueUsers = new Map(knownUsers.map((user) => [user.id, user]));

    return activeUserIds
      .map((userId) => uniqueUsers.get(userId))
      .filter((user): user is (typeof knownUsers)[number] => Boolean(user));
  }, [activeUserIds, whiteboard.collaborators, whiteboard.owner]);
  const renderedRemoteCursors = useMemo(() => {
    const knownUsers = [whiteboard.owner, ...whiteboard.collaborators.map((collaborator) => collaborator.user)];
    const uniqueUsers = new Map(knownUsers.map((user) => [user.id, user]));

    return remoteCursors
      .filter((cursor) => cursor.userId !== currentUserId)
      .map((cursor) => ({
        userId: cursor.userId,
        name: uniqueUsers.get(cursor.userId)?.name ?? 'Collaborator',
        color: getCursorColor(cursor.userId),
        x: cursor.cursor.x,
        y: cursor.cursor.y,
      }));
  }, [currentUserId, remoteCursors, whiteboard.collaborators, whiteboard.owner]);

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

  useEffect(() => {
    setTitle(whiteboard.title);
    const parsedScene = parseSceneFromContent(whiteboard.content);
    setScene(parsedScene);
    setSelectedElementIds([]);
    setActiveUserIds([currentUserId]);
    setRemoteCursors([]);
    currentSceneRef.current = parsedScene;
    lastBroadcastSceneRef.current = parsedScene;
    currentTitleRef.current = whiteboard.title;
    lastBroadcastTitleRef.current = whiteboard.title;
    suppressBroadcastRef.current = true;
  }, [currentUserId, whiteboard.content, whiteboard.title]);

  useEffect(() => {
    currentSceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

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
        const remoteScene = parseSceneFromContent(payload.content);
        const mergedScene = isSceneSnapshotChangeSummary(payload.changes)
          ? mergeScenes(currentSceneRef.current, remoteScene, payload.changes)
          : remoteScene;

        setScene(mergedScene);
        currentSceneRef.current = mergedScene;
        lastBroadcastSceneRef.current = mergedScene;
        setSelectedElementIds([]);
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

      suppressBroadcastRef.current = true;
      setTitle(response.title);
      const joinedScene = parseSceneFromContent(response.content);
      setScene(joinedScene);
      setActiveUserIds(response.activeUserIds);
      setRemoteCursors(response.activeCursors.filter((cursor) => cursor.userId !== currentUserId));
      currentSceneRef.current = joinedScene;
      lastBroadcastSceneRef.current = joinedScene;
      currentTitleRef.current = response.title;
      lastBroadcastTitleRef.current = response.title;
      setConnectionState('live');
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

    if (broadcastTimerRef.current) {
      window.clearTimeout(broadcastTimerRef.current);
    }

    setSyncState('syncing');
    broadcastTimerRef.current = window.setTimeout(() => {
      const nextScene = currentSceneRef.current;
      const nextTitle = currentTitleRef.current;
      const nextSerializedScene = serializeScene(nextScene);
      const changeSummary = buildSceneSnapshotChangeSummary(lastBroadcastSceneRef.current, nextScene);

      socketRef.current?.emit(
        'send_changes',
        {
          whiteboardId: whiteboard.id,
          changes: changeSummary,
          title: nextTitle,
          content: nextSerializedScene,
        },
        (response) => {
          if ('message' in response) {
            setError(response.message);
            setSyncState('idle');
            return;
          }

          lastBroadcastSceneRef.current = nextScene;
          lastBroadcastTitleRef.current = nextTitle;
          setSyncState('idle');
        },
      );
    }, 180);

    return () => {
      if (broadcastTimerRef.current) {
        window.clearTimeout(broadcastTimerRef.current);
      }
    };
  }, [canEdit, scene, serializedScene, title, tool, whiteboard.id]);

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

  const handleCursorActivity = (point: ScenePoint | null): void => {
    pendingCursorRef.current = point;

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

  const handleDeleteSelected = (): void => {
    if (selectedElementIds.length === 0 || !canEdit) {
      return;
    }

    setScene((currentScene) => removeElements(currentScene, selectedElementIds));
    setSelectedElementIds([]);
  };

  const handleEditSelectedNote = (): void => {
    if (
      !selectedElement ||
      (selectedElement.type !== 'note' && selectedElement.type !== 'text') ||
      !canEdit
    ) {
      return;
    }

    const nextText = window.prompt(
      selectedElement.type === 'note' ? 'Edit note' : 'Edit text',
      selectedElement.text,
    );

    if (nextText === null) {
      return;
    }

    setScene((currentScene) =>
      upsertElement(
        currentScene,
        {
          ...selectedElement,
          text: nextText.trim().length > 0 ? nextText : selectedElement.text,
          updatedAt: new Date().toISOString(),
        },
      ),
    );
  };

  const handleUpdateSelectedTextContent = (text: string): void => {
    if (
      !selectedElement ||
      (selectedElement.type !== 'note' && selectedElement.type !== 'text') ||
      !canEdit
    ) {
      return;
    }

    setScene((currentScene) => upsertElement(currentScene, updateTextElementText(selectedElement, text)));
  };

  const handleDuplicateSelected = (): void => {
    if (selectedElementIds.length === 0 || !canEdit) {
      return;
    }

    let duplicatedIds: string[] = [];

    setScene((currentScene) => {
      const duplicationResult = duplicateElements(currentScene, selectedElementIds);
      duplicatedIds = duplicationResult.duplicatedElementIds;
      return duplicationResult.scene;
    });

    if (duplicatedIds.length > 0) {
      setSelectedElementIds(duplicatedIds);
    }
  };

  const handleBringToFront = (): void => {
    if (selectedElementIds.length === 0 || !canEdit) {
      return;
    }

    setScene((currentScene) => reorderElements(currentScene, selectedElementIds, 'front'));
  };

  const handleSendToBack = (): void => {
    if (selectedElementIds.length === 0 || !canEdit) {
      return;
    }

    setScene((currentScene) => reorderElements(currentScene, selectedElementIds, 'back'));
  };

  const handleUploadRequested = (): void => {
    imageInputRef.current?.click();
  };

  const handleImagePicked = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError('Please upload an image smaller than 2 MB for the collaborative board.');
      return;
    }

    try {
      const imageElement = await loadImageFile(file);
      setScene((currentScene) => upsertElement(currentScene, imageElement));
      setSelectedElementIds([imageElement.id]);
      setTool('select');
      setError(null);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    }
  };

  const handleElementDoubleClick = (element: WhiteboardElement): void => {
    if (element.type === 'note' || element.type === 'text') {
      handleEditSelectedNote();
    }
  };

  return (
    <div className="grid gap-6">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          void handleImagePicked(event);
        }}
      />

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
            <Badge>{whiteboard.accessRole === 'owner' ? 'Owner access' : 'Collaborator access'}</Badge>
            <Badge>{scene.elements.length} elements</Badge>
            <Badge>{activeCollaborators.length} active</Badge>
          </div>
          <p className="text-sm text-muted">
            This board now uses smarter scene merging and live presence, so collaborators can work
            together with fewer accidental overwrites.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {activeCollaborators.map((user) => (
              <div
                key={user.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(94,234,212,0.9),rgba(125,211,252,0.8))] text-[10px] font-bold uppercase text-slate-950">
                  {user.name
                    .split(' ')
                    .map((part) => part[0] ?? '')
                    .join('')
                    .slice(0, 2)}
                </span>
                <span>{user.id === currentUserId ? `${user.name} (You)` : user.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
          {canDelete ? (
            <Button
              variant="danger"
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
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-2xl border border-accentSky/20 bg-accentSky/10 px-4 py-3 text-sm text-accentSky">
          Your access is currently view-only. You can explore the board, but only the owner and
          collaborators can change shapes or content.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-panelSoft/80 p-5 backdrop-blur">
            <label className="text-sm font-medium text-muted">Whiteboard title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="text-lg font-semibold"
              readOnly={!canEdit}
            />
          </div>

          <WhiteboardToolbar
            tool={tool}
            canEdit={canEdit}
            zoom={viewport.zoom}
            selectedElements={selectedElements}
            onToolChange={setTool}
            onZoomIn={() =>
              setViewport((currentViewport) => ({
                ...currentViewport,
                zoom: clampViewportZoom(currentViewport.zoom + 0.1),
              }))
            }
            onZoomOut={() =>
              setViewport((currentViewport) => ({
                ...currentViewport,
                zoom: clampViewportZoom(currentViewport.zoom - 0.1),
              }))
            }
            onResetView={() => setViewport(defaultViewport)}
            onDeleteSelected={handleDeleteSelected}
            onEditSelectedNote={handleEditSelectedNote}
            onUpdateSelectedTextContent={handleUpdateSelectedTextContent}
            onUploadImage={handleUploadRequested}
            onDuplicateSelected={handleDuplicateSelected}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />

          <WhiteboardCanvas
            scene={scene}
            canEdit={canEdit}
            tool={tool}
            selectedElementIds={selectedElementIds}
            remoteCursors={renderedRemoteCursors}
            viewport={viewport}
            onSceneChange={setScene}
            onSelectElements={setSelectedElementIds}
            onViewportChange={setViewport}
            onElementDoubleClick={handleElementDoubleClick}
            onCursorActivity={handleCursorActivity}
          />
        </div>

        <CollaborationPanel
          whiteboard={whiteboard}
          canInvite={canInvite}
          isInviting={inviteMutation.isPending}
          onInvite={inviteMutation.mutateAsync}
        />
      </div>
    </div>
  );
};
