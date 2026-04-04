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
      <AppShell immersive hideHeader>
        <div className="min-h-screen bg-[linear-gradient(180deg,#050505_0%,#090909_100%)] px-3 py-3 sm:px-4 sm:py-4">
          {whiteboardQuery.isLoading ? (
            <div className="h-[94vh] animate-pulse rounded-[32px] border border-white/10 bg-white/5" />
          ) : whiteboardQuery.error ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
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
