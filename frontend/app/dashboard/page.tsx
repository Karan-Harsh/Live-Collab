'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AppShell } from '@/components/app-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { CreateWhiteboardCard } from '@/components/dashboard/create-whiteboard-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WhiteboardCard } from '@/components/dashboard/whiteboard-card';
import { getErrorMessage } from '@/lib/error';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';
import {
  createWhiteboard,
  deleteWhiteboard,
  listWhiteboards,
} from '@/services/whiteboard-service';

const DashboardPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearSession, setUser } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      clearSession: state.clearSession,
      setUser: state.setUser,
    })),
  );

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const whiteboardsQuery = useQuery({
    queryKey: ['whiteboards'],
    queryFn: listWhiteboards,
  });

  useEffect(() => {
    if (meQuery.data && (!user || meQuery.data.id !== user.id)) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser, user]);

  const createMutation = useMutation({
    mutationFn: createWhiteboard,
    onSuccess: (whiteboard) => {
      void queryClient.invalidateQueries({
        queryKey: ['whiteboards'],
      });
      router.push(`/whiteboards/${whiteboard.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWhiteboard,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['whiteboards'],
      });
    },
  });

  const pageError =
    whiteboardsQuery.error ?? meQuery.error ?? createMutation.error ?? deleteMutation.error;

  return (
    <RouteGuard mode="protected">
      <AppShell>
        <div className="space-y-6">
          <header className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-panel/75 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Badge className="border-accent/20 bg-accent/10 text-accent">Team dashboard</Badge>
              <div>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Good to see you{user?.name ? `, ${user.name}` : ''}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                  Open private whiteboards, collaborate in live spaces, and keep every session
                  ready for the richer canvas experience we are building next.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge>{whiteboardsQuery.data?.length ?? 0} active boards</Badge>
              <Button
                variant="secondary"
                onClick={() => {
                  clearSession();
                  router.replace('/login');
                }}
              >
                Log out
              </Button>
            </div>
          </header>

          <CreateWhiteboardCard
            onCreate={createMutation.mutateAsync}
            isPending={createMutation.isPending}
          />

          {pageError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {getErrorMessage(pageError)}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {whiteboardsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
                />
              ))
            ) : whiteboardsQuery.data && whiteboardsQuery.data.length > 0 ? (
              whiteboardsQuery.data.map((whiteboard) => (
                <WhiteboardCard
                  key={whiteboard.id}
                  whiteboard={whiteboard}
                  canManage={whiteboard.ownerId === user?.id}
                  deletingWhiteboardId={deleteMutation.variables ?? null}
                  onDelete={(whiteboardId) => {
                    if (window.confirm('Delete this whiteboard permanently?')) {
                      deleteMutation.mutate(whiteboardId);
                    }
                  }}
                />
              ))
            ) : (
              <div className="col-span-full rounded-[32px] border border-dashed border-white/10 bg-panel/60 p-10 text-center">
                <h2 className="text-xl font-semibold text-white">No whiteboards yet</h2>
                <p className="mt-2 text-sm text-muted">
                  Create your first collaborative whiteboard to start the workspace.
                </p>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </RouteGuard>
  );
};

export default DashboardPage;
