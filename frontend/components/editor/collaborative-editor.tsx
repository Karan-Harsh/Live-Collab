'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CollaborationPanel } from '@/components/editor/collaboration-panel';
import { WhiteboardCanvas } from '@/components/editor/whiteboard-canvas';
import { WhiteboardToolbar } from '@/components/editor/whiteboard-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { createWhiteboard, deleteWhiteboard } from '@/services/whiteboard-service';

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
  WhiteboardScene,
  WhiteboardTool,
} from '@/lib/whiteboard-scene';
import type { ChangeEvent } from 'react';

interface CollaborativeEditorProps {
  whiteboard: WhiteboardRecord;
  accessToken: string;
  currentUserId: string;
}

interface WhiteboardHistorySnapshot {
  title: string;
  content: string;
}

type ConnectionState = 'connecting' | 'live' | 'offline';
type SyncState = 'idle' | 'syncing' | 'remote-update';

const defaultViewport: ViewportState = {
  x: 0,
  y: 0,
  zoom: 0.72,
};

const cursorPalette = ['#f5f5f5', '#d4d4d4', '#a3a3a3', '#737373', '#e5e5e5', '#bfbfbf'];

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

const isTextInputFocused = (): boolean => {
  const activeElement = document.activeElement;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    activeElement instanceof HTMLButtonElement
  );
};

const cloneSnapshot = (snapshot: WhiteboardHistorySnapshot): WhiteboardHistorySnapshot => ({
  title: snapshot.title,
  content: snapshot.content,
});

const downloadFile = (filename: string, content: string, type: string): void => {
  const blob = new Blob([content], { type });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(objectUrl);
};

const getSelectionLabel = (
  selectedElementsCount: number,
  selectedElementType: string | undefined,
): string => {
  if (selectedElementsCount > 1) {
    return `${selectedElementsCount} elements selected`;
  }

  switch (selectedElementType) {
    case 'text':
      return 'Text block';
    case 'note':
      return 'Sticky note';
    case 'rectangle':
      return 'Rectangle';
    case 'ellipse':
      return 'Ellipse';
    case 'arrow':
      return 'Arrow';
    case 'stroke':
      return 'Drawing';
    case 'image':
      return 'Image';
    default:
      return 'Element';
  }
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const cursorBroadcastTimerRef = useRef<number | null>(null);
  const historyCaptureTimerRef = useRef<number | null>(null);
  const suppressBroadcastRef = useRef(true);
  const skipHistoryCaptureRef = useRef(true);
  const pendingCursorRef = useRef<ScenePoint | null>(null);
  const currentSceneRef = useRef<WhiteboardScene>(parseSceneFromContent(whiteboard.content));
  const lastBroadcastSceneRef = useRef<WhiteboardScene>(parseSceneFromContent(whiteboard.content));
  const currentTitleRef = useRef(whiteboard.title);
  const lastBroadcastTitleRef = useRef(whiteboard.title);
  const historyBaseSnapshotRef = useRef<WhiteboardHistorySnapshot>({
    title: whiteboard.title,
    content: serializeScene(parseSceneFromContent(whiteboard.content)),
  });
  const undoStackRef = useRef<WhiteboardHistorySnapshot[]>([]);
  const redoStackRef = useRef<WhiteboardHistorySnapshot[]>([]);

  const [title, setTitle] = useState(whiteboard.title);
  const [scene, setScene] = useState<WhiteboardScene>(() => parseSceneFromContent(whiteboard.content));
  const [tool, setTool] = useState<WhiteboardTool>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [activeUserIds, setActiveUserIds] = useState<string[]>([currentUserId]);
  const [remoteCursors, setRemoteCursors] = useState<RealtimeCursorPresencePayload[]>([]);
  const [isCollaborationPanelOpen, setIsCollaborationPanelOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canEdit = whiteboard.permissions.canEdit;
  const canDelete = whiteboard.permissions.canDelete;
  const canInvite = whiteboard.permissions.canInvite;
  const selectedElements = scene.elements.filter((element) => selectedElementIds.includes(element.id));
  const selectedElement = selectedElements.at(-1) ?? null;
  const editableTextElement =
    selectedElement?.type === 'note' || selectedElement?.type === 'text' ? selectedElement : null;
  const selectionLabel = getSelectionLabel(selectedElements.length, selectedElement?.type);
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
  const undoCount = historyVersion >= 0 ? undoStackRef.current.length : 0;
  const redoCount = historyVersion >= 0 ? redoStackRef.current.length : 0;

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
        content: serializeScene(currentSceneRef.current),
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

  useEffect(() => {
    setTitle(whiteboard.title);
    const parsedScene = parseSceneFromContent(whiteboard.content);
    const snapshot = {
      title: whiteboard.title,
      content: serializeScene(parsedScene),
    };
    setScene(parsedScene);
    setSelectedElementIds([]);
    setActiveUserIds([currentUserId]);
    setRemoteCursors([]);
    currentSceneRef.current = parsedScene;
    lastBroadcastSceneRef.current = parsedScene;
    currentTitleRef.current = whiteboard.title;
    lastBroadcastTitleRef.current = whiteboard.title;
    historyBaseSnapshotRef.current = snapshot;
    undoStackRef.current = [];
    redoStackRef.current = [];
    skipHistoryCaptureRef.current = true;
    setHistoryVersion((currentVersion) => currentVersion + 1);
    suppressBroadcastRef.current = true;
  }, [currentUserId, whiteboard.content, whiteboard.title]);

  useEffect(() => {
    currentSceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    const currentSnapshot = {
      title,
      content: serializedScene,
    };

    if (skipHistoryCaptureRef.current) {
      historyBaseSnapshotRef.current = cloneSnapshot(currentSnapshot);
      skipHistoryCaptureRef.current = false;
      return;
    }

    if (historyCaptureTimerRef.current !== null) {
      window.clearTimeout(historyCaptureTimerRef.current);
    }

    historyCaptureTimerRef.current = window.setTimeout(() => {
      const previousSnapshot = historyBaseSnapshotRef.current;

      if (
        previousSnapshot.title === currentSnapshot.title &&
        previousSnapshot.content === currentSnapshot.content
      ) {
        return;
      }

      undoStackRef.current = [...undoStackRef.current, cloneSnapshot(previousSnapshot)].slice(-75);
      redoStackRef.current = [];
      historyBaseSnapshotRef.current = cloneSnapshot(currentSnapshot);
      setHistoryVersion((currentVersion) => currentVersion + 1);
    }, 220);

    return () => {
      if (historyCaptureTimerRef.current !== null) {
        window.clearTimeout(historyCaptureTimerRef.current);
      }
    };
  }, [serializedScene, title]);

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
        skipHistoryCaptureRef.current = true;
        setTitle(payload.title);
        currentTitleRef.current = payload.title;
        lastBroadcastTitleRef.current = payload.title;
        historyBaseSnapshotRef.current = {
          title: payload.title,
          content: serializeScene(currentSceneRef.current),
        };
      }

      if (payload.content !== undefined) {
        const remoteScene = parseSceneFromContent(payload.content);
        const mergedScene = isSceneSnapshotChangeSummary(payload.changes)
          ? mergeScenes(currentSceneRef.current, remoteScene, payload.changes)
          : remoteScene;

        skipHistoryCaptureRef.current = true;
        setScene(mergedScene);
        currentSceneRef.current = mergedScene;
        lastBroadcastSceneRef.current = mergedScene;
        historyBaseSnapshotRef.current = {
          title: payload.title ?? currentTitleRef.current,
          content: serializeScene(mergedScene),
        };
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
      skipHistoryCaptureRef.current = true;
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

  const handleExportJson = (): void => {
    const payload = JSON.stringify(
      {
        title: currentTitleRef.current,
        exportedAt: new Date().toISOString(),
        scene: currentSceneRef.current,
      },
      null,
      2,
    );

    downloadFile(
      `${currentTitleRef.current.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'whiteboard'}.json`,
      payload,
      'application/json',
    );
  };

  const handleImportRequested = (): void => {
    importInputRef.current?.click();
  };

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const rawContent = await file.text();
      const parsedContent = JSON.parse(rawContent) as unknown;
      const importedObject = parsedContent as { title?: string; scene?: unknown };
      const importedTitle =
        typeof importedObject.title === 'string' && importedObject.title.trim().length > 0
          ? importedObject.title.trim()
          : `${currentTitleRef.current} imported`;
      const importedScene = parseSceneFromContent(
        JSON.stringify(importedObject.scene ?? parsedContent),
      );
      const importedContent = serializeScene(importedScene);

      undoStackRef.current = [];
      redoStackRef.current = [];
      applyHistorySnapshot({
        title: importedTitle,
        content: importedContent,
      });
      setTool('select');
      setError(null);
    } catch (importError) {
      setError(getErrorMessage(importError));
    }
  };

  useEffect(() => {
    return () => {
      if (cursorBroadcastTimerRef.current !== null) {
        window.clearTimeout(cursorBroadcastTimerRef.current);
      }
      if (historyCaptureTimerRef.current !== null) {
        window.clearTimeout(historyCaptureTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (isModifierPressed && event.key.toLowerCase() === 'z') {
        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      if (isModifierPressed && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (isTextInputFocused()) {
        return;
      }

      if (isModifierPressed && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedElementIds(currentSceneRef.current.elements.map((element) => element.id));
        return;
      }

      const nextTool = (() => {
        switch (event.key.toLowerCase()) {
          case 'v':
            return 'select';
          case 'h':
            return 'hand';
          case 'd':
            return 'draw';
          case 'r':
            return 'rectangle';
          case 'o':
            return 'ellipse';
          case 'a':
            return 'arrow';
          case 'n':
            return 'note';
          case 't':
            return 'text';
          default:
            return null;
        }
      })();

      if (nextTool) {
        event.preventDefault();
        setTool(nextTool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const applyHistorySnapshot = (snapshot: WhiteboardHistorySnapshot): void => {
    if (historyCaptureTimerRef.current !== null) {
      window.clearTimeout(historyCaptureTimerRef.current);
    }

    const nextScene = parseSceneFromContent(snapshot.content);

    skipHistoryCaptureRef.current = true;
    suppressBroadcastRef.current = false;
    historyBaseSnapshotRef.current = cloneSnapshot(snapshot);
    currentSceneRef.current = nextScene;
    lastBroadcastSceneRef.current = nextScene;
    currentTitleRef.current = snapshot.title;
    lastBroadcastTitleRef.current = snapshot.title;
    setTitle(snapshot.title);
    setScene(nextScene);
    setSelectedElementIds([]);
    setHistoryVersion((currentVersion) => currentVersion + 1);
  };

  const handleUndo = (): void => {
    const previousSnapshot = undoStackRef.current.at(-1);

    if (!previousSnapshot) {
      return;
    }

    const currentSnapshot = historyBaseSnapshotRef.current;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, cloneSnapshot(currentSnapshot)].slice(-75);
    applyHistorySnapshot(previousSnapshot);
  };

  const handleRedo = (): void => {
    const nextSnapshot = redoStackRef.current.at(-1);

    if (!nextSnapshot) {
      return;
    }

    const currentSnapshot = historyBaseSnapshotRef.current;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, cloneSnapshot(currentSnapshot)].slice(-75);
    applyHistorySnapshot(nextSnapshot);
  };

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
        ? 'Updated by a collaborator'
        : 'Live sync ready';

  const handleDeleteSelected = (): void => {
    if (selectedElementIds.length === 0 || !canEdit) {
      return;
    }

    setScene((currentScene) => removeElements(currentScene, selectedElementIds));
    setSelectedElementIds([]);
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

  return (
    <div className="relative h-[calc(100vh-0.75rem)] min-h-[760px]">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          void handleImagePicked(event);
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void handleImportJson(event);
        }}
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
        onCursorActivity={handleCursorActivity}
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-20">
        <div className="grid grid-cols-[minmax(240px,320px)_1fr_minmax(230px,300px)] items-start gap-4">
          <div className="pointer-events-auto rounded-[24px] border border-white/12 bg-[#080808] px-4 py-3 shadow-[0_22px_80px_rgba(0,0,0,0.32)]">
            <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] ${connectionMeta.textClassName}`}>
              <span className={`h-2 w-2 rounded-full ${connectionMeta.dotClassName}`} />
              <span>{connectionMeta.label}</span>
            </div>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-auto border-none bg-transparent px-0 py-0 text-[1.7rem] font-semibold tracking-[-0.05em] text-white focus:border-none focus:bg-transparent focus:shadow-none"
              readOnly={!canEdit}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
              <span>{scene.elements.length} elements</span>
              <span>&bull;</span>
              <span>{activeCollaborators.length} active</span>
              <span>&bull;</span>
              <span>{whiteboard.accessRole === 'owner' ? 'Owner' : 'Collaborator'}</span>
            </div>
          </div>

          <div className="pointer-events-auto flex justify-center">
            <WhiteboardToolbar
              tool={tool}
              canEdit={canEdit}
              onToolChange={setTool}
              onUploadImage={handleUploadRequested}
            />
          </div>

          <div className="pointer-events-auto rounded-[24px] border border-white/12 bg-[#080808] px-4 py-3 shadow-[0_22px_80px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {activeCollaborators.slice(0, 3).map((user, index) => (
                  <span
                    key={user.id}
                    className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-[11px] font-bold uppercase text-white first:ml-0"
                    style={{ zIndex: activeCollaborators.length - index }}
                    title={user.id === currentUserId ? `${user.name} (You)` : user.name}
                  >
                    {user.name
                      .split(' ')
                      .map((part) => part[0] ?? '')
                      .join('')
                      .slice(0, 2)}
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Workspace
                </p>
                <p className="truncate text-sm font-medium text-white">
                  {activeCollaborators.length} collaborator{activeCollaborators.length === 1 ? '' : 's'} live
                </p>
              </div>
              <Button
                variant="secondary"
                className="rounded-[16px] px-3 py-2"
                onClick={() => setIsCollaborationPanelOpen(true)}
              >
                People
              </Button>
              <Button
                variant="ghost"
                className="rounded-[16px] px-3 py-2"
                onClick={() => router.push('/dashboard')}
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {selectedElements.length > 0 ? (
        <div className="pointer-events-none absolute right-4 top-[92px] z-20 w-full max-w-[320px]">
          <div className="pointer-events-auto max-h-[calc(100vh-14rem)] overflow-y-auto rounded-[24px] border border-white/12 bg-[#080808] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.32)]">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Selection
              </p>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium text-white">{selectionLabel}</p>
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="rounded-[16px] px-3 py-2.5"
                disabled={!canEdit}
                onClick={handleDuplicateSelected}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                className="rounded-[16px] px-3 py-2.5"
                disabled={!canEdit}
                onClick={handleDeleteSelected}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                className="rounded-[16px] px-3 py-2.5"
                disabled={!canEdit}
                onClick={handleBringToFront}
              >
                Bring front
              </Button>
              <Button
                variant="ghost"
                className="rounded-[16px] px-3 py-2.5"
                disabled={!canEdit}
                onClick={handleSendToBack}
              >
                Send back
              </Button>
            </div>

            {editableTextElement ? (
              <div className="mt-4 space-y-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
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
                  onChange={(event) => handleUpdateSelectedTextContent(event.target.value)}
                  placeholder={editableTextElement.type === 'note' ? 'Write your note...' : 'Write text...'}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
        {error ? (
          <div className="pointer-events-auto max-w-md rounded-[22px] border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            {error}
          </div>
        ) : null}

        {!canEdit ? (
          <div className="pointer-events-auto max-w-md rounded-[22px] border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white/75 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
            View only. You can navigate, export, or duplicate this board into your own workspace.
          </div>
        ) : null}

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-[22px] border border-white/12 bg-[#080808] p-2 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
          <Button variant="ghost" className="rounded-[16px] px-3 py-2" onClick={handleUndo} disabled={!canEdit || undoCount === 0}>
            Undo
          </Button>
          <Button variant="ghost" className="rounded-[16px] px-3 py-2" onClick={handleRedo} disabled={!canEdit || redoCount === 0}>
            Redo
          </Button>
          <Button variant="ghost" className="rounded-[16px] px-3 py-2" onClick={handleExportJson}>
            Export
          </Button>
          <Button variant="ghost" className="rounded-[16px] px-3 py-2" onClick={handleImportRequested} disabled={!canEdit}>
            Import
          </Button>
          <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <Button
            variant="secondary"
            className="rounded-[16px] px-3 py-2"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
          {canDelete ? (
            <Button
              variant="danger"
              className="rounded-[16px] px-3 py-2"
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

      <div className="pointer-events-none absolute bottom-4 left-4 z-20">
        <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-white/12 bg-[#080808] p-2 shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
          <Button
            variant="ghost"
            className="h-10 rounded-[16px] px-3"
            onClick={() =>
              setViewport((currentViewport) => ({
                ...currentViewport,
                zoom: clampViewportZoom(currentViewport.zoom - 0.1),
              }))
            }
          >
            -
          </Button>
          <span className="min-w-[54px] text-center text-[11px] font-semibold text-white/68">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            className="h-10 rounded-[16px] px-3"
            onClick={() =>
              setViewport((currentViewport) => ({
                ...currentViewport,
                zoom: clampViewportZoom(currentViewport.zoom + 0.1),
              }))
            }
          >
            +
          </Button>
          <div className="h-6 w-px bg-white/10" />
          <Button
            variant="ghost"
            className="h-10 rounded-[16px] px-3 text-[11px] uppercase tracking-[0.12em]"
            onClick={() => setViewport(defaultViewport)}
          >
            Reset
          </Button>
        </div>
      </div>

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
