'use client';

import { Button } from '@/components/ui/button';

import type { WhiteboardInvitationRecord } from '@/lib/types';

interface InvitationInboxProps {
  invitations: WhiteboardInvitationRecord[];
  acceptingInvitationId: string | null;
  decliningInvitationId: string | null;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
}

export const InvitationInbox = ({
  invitations,
  acceptingInvitationId,
  decliningInvitationId,
  onAccept,
  onDecline,
}: InvitationInboxProps) => {
  if (invitations.length === 0) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-panel/75 p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accentSky">
          Notifications
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">No pending invites</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          When a teammate invites you to a whiteboard, it will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-accentSky/15 bg-accentSky/5 p-6 backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accentSky">
        Notifications
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Pending whiteboard invites</h2>
      <div className="mt-5 grid gap-3">
        {invitations.map((invitation) => (
          <article
            key={invitation.id}
            className="rounded-2xl border border-white/10 bg-panel/80 p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {invitation.whiteboard?.title ?? 'Whiteboard invitation'}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {invitation.inviter.name} invited you to collaborate.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Received {new Date(invitation.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => onAccept(invitation.id)}
                  disabled={acceptingInvitationId === invitation.id}
                >
                  {acceptingInvitationId === invitation.id ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onDecline(invitation.id)}
                  disabled={decliningInvitationId === invitation.id}
                >
                  {decliningInvitationId === invitation.id ? 'Declining...' : 'Decline'}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
