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
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.88),rgba(8,8,8,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
          Notifications
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              No pending invites
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              When a teammate invites you to a whiteboard, it will appear here.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            Inbox stays clear until someone brings you into a board.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.92),rgba(8,8,8,0.78))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
            Notifications
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
            Pending whiteboard invites
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Accept the rooms you want in your active workspace and decline the rest cleanly.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
          {invitations.length} invite{invitations.length === 1 ? '' : 's'} waiting
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {invitations.map((invitation) => (
          <article
            key={invitation.id}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Invitation
                  </span>
                  <span className="text-xs text-slate-400">
                    Received {new Date(invitation.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {invitation.whiteboard?.title ?? 'Whiteboard invitation'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {invitation.inviter.name} invited you to collaborate on a private board.
                  </p>
                </div>
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
