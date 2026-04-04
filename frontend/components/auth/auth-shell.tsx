import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';

import type { PropsWithChildren } from 'react';

interface AuthShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
}

export const AuthShell = ({
  children,
  eyebrow,
  title,
  description,
  alternateHref,
  alternateLabel,
}: AuthShellProps) => {
  return (
    <AppShell className="flex items-center">
      <div className="grid w-full gap-8 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.92),rgba(7,7,7,0.82))] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.38)] backdrop-blur xl:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-7">
              <Badge className="border-white/10 bg-white/[0.06] text-white">
                Collaborative Whiteboard OS
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl xl:text-6xl">
                  Build, sketch, and align in a workspace that feels made for product teams.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Liv Collab blends private invites, realtime board sync, and visual thinking tools
                  into one focused studio for design reviews, planning sessions, and execution.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[30px] border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                  Why Teams Stay
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-3xl font-semibold text-white">Instant</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Shapes, notes, freehand drawing, and images sync live without leaving the board.
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-white">Private</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Access stays invite-only, so collaboration happens with the right people from the start.
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-white">Focused</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      A calm visual system keeps the board feeling premium instead of noisy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(8,8,8,0.18))] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">
                    Realtime
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">Socket-powered live rooms</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Collaborators see board changes land almost immediately.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(8,8,8,0.18))] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">
                    Access
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">Invitation-led workspaces</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Owners control exactly who can enter and contribute.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.92),rgba(8,8,8,0.8))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.34)] backdrop-blur xl:p-10">
          <div className="mb-8 space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
              {eyebrow}
            </p>
            <h2 className="max-w-lg text-3xl font-semibold tracking-[-0.03em] text-white sm:text-[2.25rem]">
              {title}
            </h2>
            <p className="max-w-md text-sm leading-7 text-slate-400">{description}</p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
            {children}
          </div>

          <p className="mt-6 text-sm text-slate-400">
            Need a different path?{' '}
            <Link
              href={alternateHref}
              className="font-semibold text-white transition hover:text-white/70"
            >
              {alternateLabel}
            </Link>
          </p>
        </section>
      </div>
    </AppShell>
  );
};
