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
          <header className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,33,0.9),rgba(8,18,28,0.74))] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.32)] backdrop-blur sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-accentSky/20 bg-accentSky/10 text-accentSky">
                Whiteboard room
              </Badge>
              <Badge className="border-accent/20 bg-accent/10 text-accent">
                Visual collaboration studio
              </Badge>
            </div>
            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Collaborative whiteboard workspace
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                  Live board updates stream over Socket.IO while the backend persists structured scene
                  snapshots, so drawing, notes, and images stay fast for invited collaborators.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Board mode
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">Realtime scene sync</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Access
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">Private invited workspace</p>
                </div>
              </div>
            </div>
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
