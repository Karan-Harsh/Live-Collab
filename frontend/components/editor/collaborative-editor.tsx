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
  MAX_IMAGE_UPLOAD_BYTES,
  clampViewportZoom,
  createImageElement,
  duplicateElement,
  parseSceneFromContent,
  reorderElement,
  removeElement,
  serializeScene,
  updateNoteElementText,
  upsertElement,
} from '@/lib/whiteboard-scene';
import { disconnectRealtimeSocket, getRealtimeSocket } from '@/services/realtime-service';
import { createInvitation } from '@/services/invitation-service';
import { deleteWhiteboard } from '@/services/whiteboard-service';

import type { RealtimeReceiveChangesPayload, WhiteboardRecord } from '@/lib/types';
import type {
  ImageElement,
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
  const suppressBroadcastRef = useRef(true);

  const [title, setTitle] = useState(whiteboard.title);
  const [scene, setScene] = useState<WhiteboardScene>(() => parseSceneFromContent(whiteboard.content));
  const [tool, setTool] = useState<WhiteboardTool>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState<string | null>(null);

  const canEdit = whiteboard.permissions.canEdit;
  const canDelete = whiteboard.permissions.canDelete;
  const canInvite = whiteboard.permissions.canInvite;
  const selectedElement =
    selectedElementId !== null
      ? scene.elements.find((element) => element.id === selectedElementId) ?? null
      : null;
  const serializedScene = serializeScene(scene);

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
    setScene(parseSceneFromContent(whiteboard.content));
    setSelectedElementId(null);
    suppressBroadcastRef.current = true;
  }, [whiteboard.content, whiteboard.title]);

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
      if (payload.whiteboardId !== whiteboard.id || payload.updatedBy === currentUserId) {
        return;
      }

      suppressBroadcastRef.current = true;

      if (payload.title !== undefined) {
        setTitle(payload.title);
      }

      if (payload.content !== undefined) {
        setScene(parseSceneFromContent(payload.content));
        setSelectedElementId(null);
      }

      setSyncState('remote-update');
      window.setTimeout(() => setSyncState('idle'), 1000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_changes', handleReceiveChanges);

    socket.connect();
    socket.emit('join_whiteboard', { whiteboardId: whiteboard.id }, (response) => {
      if ('message' in response) {
        setError(response.message);
        return;
      }

      suppressBroadcastRef.current = true;
      setTitle(response.title);
      setScene(parseSceneFromContent(response.content));
      setConnectionState('live');
    });

    return () => {
      socket.emit('leave_whiteboard', { whiteboardId: whiteboard.id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive_changes', handleReceiveChanges);
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
      socketRef.current?.emit(
        'send_changes',
        {
          whiteboardId: whiteboard.id,
          changes: {
            type: 'scene_snapshot',
            elementCount: scene.elements.length,
            tool,
          },
          title,
          content: serializedScene,
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
  }, [canEdit, scene.elements.length, serializedScene, title, tool, whiteboard.id]);

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
    if (!selectedElementId || !canEdit) {
      return;
    }

    setScene((currentScene) => removeElement(currentScene, selectedElementId));
    setSelectedElementId(null);
  };

  const handleEditSelectedNote = (): void => {
    if (!selectedElement || selectedElement.type !== 'note' || !canEdit) {
      return;
    }

    const nextText = window.prompt('Edit note', selectedElement.text);

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

  const handleUpdateSelectedNoteText = (text: string): void => {
    if (!selectedElement || selectedElement.type !== 'note' || !canEdit) {
      return;
    }

    setScene((currentScene) =>
      upsertElement(currentScene, updateNoteElementText(selectedElement, text)),
    );
  };

  const handleDuplicateSelected = (): void => {
    if (!selectedElementId || !canEdit) {
      return;
    }

    let duplicatedElementId: string | null = null;

    setScene((currentScene) => {
      const duplicationResult = duplicateElement(currentScene, selectedElementId);
      duplicatedElementId = duplicationResult.duplicatedElementId;
      return duplicationResult.scene;
    });

    if (duplicatedElementId) {
      setSelectedElementId(duplicatedElementId);
    }
  };

  const handleBringToFront = (): void => {
    if (!selectedElementId || !canEdit) {
      return;
    }

    setScene((currentScene) => reorderElement(currentScene, selectedElementId, 'front'));
  };

  const handleSendToBack = (): void => {
    if (!selectedElementId || !canEdit) {
      return;
    }

    setScene((currentScene) => reorderElement(currentScene, selectedElementId, 'back'));
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
      setSelectedElementId(imageElement.id);
      setTool('select');
      setError(null);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    }
  };

  const handleElementDoubleClick = (element: WhiteboardElement): void => {
    if (element.type === 'note') {
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
          </div>
          <p className="text-sm text-muted">
            This board now uses a structured scene model, so shapes, strokes, notes, and images
            sync live across collaborators.
          </p>
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
            selectedElement={selectedElement}
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
            onUpdateSelectedNoteText={handleUpdateSelectedNoteText}
            onUploadImage={handleUploadRequested}
            onDuplicateSelected={handleDuplicateSelected}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
          />

          <WhiteboardCanvas
            scene={scene}
            canEdit={canEdit}
            tool={tool}
            selectedElementId={selectedElementId}
            viewport={viewport}
            onSceneChange={setScene}
            onSelectElement={setSelectedElementId}
            onViewportChange={setViewport}
            onElementDoubleClick={handleElementDoubleClick}
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
