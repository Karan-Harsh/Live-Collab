'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { WhiteboardRecord } from '@/lib/types';

interface CollaborationPanelProps {
  whiteboard: WhiteboardRecord;
  canInvite: boolean;
  isInviting: boolean;
  onInvite: (email: string) => Promise<unknown>;
}

export const CollaborationPanel = ({
  whiteboard,
  canInvite,
  isInviting,
  onInvite,
}: CollaborationPanelProps) => {
  const [email, setEmail] = useState('');

  return (
    <aside className="rounded-[30px] border border-white/10 bg-panel/80 p-5 backdrop-blur">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accentSky">
            Collaborators
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Access control</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Only invited collaborators can open and edit this whiteboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-panelSoft/80 p-4">
          <p className="text-sm font-medium text-white">Owner</p>
          <p className="mt-2 text-sm text-muted">
            {whiteboard.owner.name} · {whiteboard.owner.email}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-white">
            Active collaborators ({whiteboard.collaborators.length})
          </p>
          {whiteboard.collaborators.length > 0 ? (
            <div className="grid gap-3">
              {whiteboard.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="rounded-2xl border border-white/10 bg-panelSoft/70 p-4"
                >
                  <p className="text-sm font-medium text-white">{collaborator.user.name}</p>
                  <p className="mt-1 text-sm text-muted">{collaborator.user.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panelSoft/50 p-4 text-sm text-muted">
              No collaborators yet.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-white">
            Pending invites ({whiteboard.pendingInvites.length})
          </p>
          {whiteboard.pendingInvites.length > 0 ? (
            <div className="grid gap-3">
              {whiteboard.pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-accent/15 bg-accent/5 p-4"
                >
                  <p className="text-sm font-medium text-white">{invite.recipient.name}</p>
                  <p className="mt-1 text-sm text-muted">{invite.recipient.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panelSoft/50 p-4 text-sm text-muted">
              No pending invites.
            </div>
          )}
        </div>

        {canInvite ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextEmail = email.trim().toLowerCase();

              if (!nextEmail) {
                return;
              }

              void onInvite(nextEmail).then(() => {
                setEmail('');
              });
            }}
          >
            <p className="text-sm font-medium text-white">Invite an existing user</p>
            <Input
              type="email"
              value={email}
              placeholder="teammate@company.com"
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" disabled={isInviting || email.trim().length === 0}>
              {isInviting ? 'Sending invite...' : 'Send invite'}
            </Button>
          </form>
        ) : null}
      </div>
    </aside>
  );
};
