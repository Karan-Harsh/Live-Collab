'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AppShell } from '@/components/app-shell';
import { RouteGuard } from '@/components/auth/route-guard';
import { CreateDocumentCard } from '@/components/dashboard/create-document-card';
import { DocumentCard } from '@/components/dashboard/document-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error';
import { getCurrentUser } from '@/services/auth-service';
import { useAuthStore } from '@/services/auth-store';
import { createDocument, deleteDocument, listDocuments } from '@/services/document-service';

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

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  });

  useEffect(() => {
    if (meQuery.data && (!user || meQuery.data.id !== user.id)) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser, user]);

  const createMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: (document) => {
      void queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
      router.push(`/documents/${document.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
    },
  });

  const pageError =
    documentsQuery.error ?? meQuery.error ?? createMutation.error ?? deleteMutation.error;

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
                  Open private drafts, share review-ready documents, and jump back into live rooms
                  without losing context.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge>{documentsQuery.data?.length ?? 0} active docs</Badge>
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

          <CreateDocumentCard
            onCreate={createMutation.mutateAsync}
            isPending={createMutation.isPending}
          />

          {pageError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {getErrorMessage(pageError)}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documentsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
                />
              ))
            ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
              documentsQuery.data.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  canManage={document.ownerId === user?.id}
                  deletingDocumentId={deleteMutation.variables ?? null}
                  onDelete={(documentId) => {
                    if (window.confirm('Delete this document permanently?')) {
                      deleteMutation.mutate(documentId);
                    }
                  }}
                />
              ))
            ) : (
              <div className="col-span-full rounded-[32px] border border-dashed border-white/10 bg-panel/60 p-10 text-center">
                <h2 className="text-xl font-semibold text-white">No documents yet</h2>
                <p className="mt-2 text-sm text-muted">
                  Create your first collaborative document to start the workspace.
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
