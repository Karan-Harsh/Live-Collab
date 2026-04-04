'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AppShell } from '@/components/app-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { CollaborativeEditor } from '@/components/editor/collaborative-editor';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/error';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';
import { getWhiteboard } from '@/services/whiteboard-service';

const WhiteboardPage = () => {
  const params = useParams<{ id: string }>();
  const { accessToken, user, setUser } = useAuthStore(
    useShallow((state) => ({
      accessToken: state.accessToken,
      user: state.user,
      setUser: state.setUser,
    })),
  );

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
    enabled: !user,
    staleTime: 5 * 60 * 1000,
  });

  const whiteboardQuery = useQuery({
    queryKey: ['whiteboard', params.id],
    queryFn: () => getWhiteboard(params.id),
    enabled: Boolean(params.id),
  });

  useEffect(() => {
    if (meQuery.data && (!user || meQuery.data.id !== user.id)) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser, user]);

  return (
    <RouteGuard mode="protected">
      <AppShell>
        <div className="space-y-6">
          <header className="rounded-[30px] border border-white/10 bg-panel/75 p-6 backdrop-blur">
            <Badge className="border-accentSky/20 bg-accentSky/10 text-accentSky">
              Whiteboard room
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Collaborative whiteboard workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Live updates stream over Socket.IO while the backend persists debounced whiteboard
              snapshots to keep collaboration responsive under load.
            </p>
          </header>

          {whiteboardQuery.isLoading ? (
            <div className="h-[60vh] animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
          ) : whiteboardQuery.error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {getErrorMessage(whiteboardQuery.error)}
            </div>
          ) : whiteboardQuery.data && accessToken && (user ?? meQuery.data) ? (
            <CollaborativeEditor
              whiteboard={whiteboardQuery.data}
              accessToken={accessToken}
              currentUserId={(user ?? meQuery.data)!.id}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-panel/70 px-4 py-3 text-sm text-muted">
              Loading whiteboard context...
            </div>
          )}
        </div>
      </AppShell>
    </RouteGuard>
  );
};

export default WhiteboardPage;
