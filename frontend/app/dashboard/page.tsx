'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AppShell } from '@/components/app-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { CreateWhiteboardCard } from '@/components/dashboard/create-whiteboard-card';
import { InvitationInbox } from '@/components/dashboard/invitation-inbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WhiteboardCard } from '@/components/dashboard/whiteboard-card';
import { getErrorMessage } from '@/lib/error';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';
import {
  acceptInvitation,
  declineInvitation,
  listInvitations,
} from '@/services/invitation-service';
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

  const invitationsQuery = useQuery({
    queryKey: ['invitations'],
    queryFn: listInvitations,
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

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['invitations'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['whiteboards'],
        }),
      ]);
    },
  });

  const declineMutation = useMutation({
    mutationFn: declineInvitation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['invitations'],
      });
    },
  });

  const pageError =
    whiteboardsQuery.error ??
    invitationsQuery.error ??
    meQuery.error ??
    createMutation.error ??
    deleteMutation.error ??
    acceptMutation.error ??
    declineMutation.error;

  return (
    <RouteGuard mode="protected">
      <AppShell>
        <div className="space-y-8">
          <header className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,20,31,0.9),rgba(9,18,28,0.72))] p-7 shadow-[0_30px_100px_rgba(2,6,23,0.34)] backdrop-blur sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-accent/20 bg-accent/10 text-accent">Studio dashboard</Badge>
                <Badge className="border-[#f6c177]/20 bg-[#f6c177]/10 text-[#f6c177]">
                  Invite-only collaboration
                </Badge>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Good to see you{user?.name ? `, ${user.name}` : ''}. Your boards are ready for the next session.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Open private whiteboards, accept invited rooms, and move directly into the new visual
                canvas without losing the structure of your workspace.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Active boards
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {whiteboardsQuery.data?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pending invites
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {invitationsQuery.data?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Collaboration mode
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">Private by design</p>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,33,0.88),rgba(8,18,28,0.74))] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.3)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accentSky">
                Workspace controls
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-white">Session state</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Your dashboard reflects live invitation state and board access as it changes.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-white">Account</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Signed in as {user?.email ?? 'your workspace account'}.
                  </p>
                </div>
              </div>
              <Button
                className="mt-6 w-full"
                variant="secondary"
                onClick={() => {
                  clearSession();
                  router.replace('/login');
                }}
              >
                Log out
              </Button>
            </section>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <InvitationInbox
              invitations={invitationsQuery.data ?? []}
              acceptingInvitationId={acceptMutation.variables ?? null}
              decliningInvitationId={declineMutation.variables ?? null}
              onAccept={(invitationId) => acceptMutation.mutate(invitationId)}
              onDecline={(invitationId) => declineMutation.mutate(invitationId)}
            />

            <CreateWhiteboardCard
              onCreate={createMutation.mutateAsync}
              isPending={createMutation.isPending}
            />
          </div>

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
              <div className="col-span-full rounded-[36px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(10,22,33,0.72),rgba(8,18,28,0.58))] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  No whiteboards yet
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Create the first private board and turn this empty studio into a working room.
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
