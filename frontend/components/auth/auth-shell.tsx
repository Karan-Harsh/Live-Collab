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
    <AppShell className="flex items-center" hideHeader>
      <div className="mx-auto grid w-full max-w-[1340px] gap-10 xl:grid-cols-[1.24fr_0.76fr]">
        <section className="relative flex min-h-[720px] items-center overflow-hidden rounded-[44px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.9),rgba(6,6,6,0.84))] px-8 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.42)] sm:px-10 xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.05),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]" />
          <div className="relative mx-auto flex w-full max-w-[760px] flex-col gap-14">
            <div className="space-y-7">
              <Badge className="w-fit border-white/10 bg-white/[0.04] text-white/80">
                Live Collab
              </Badge>

              <div className="space-y-6">
                <h1 className="max-w-4xl font-serif text-5xl font-medium leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl xl:text-[6.25rem]">
                  Whiteboards for teams that prefer clarity over noise.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  A private collaboration space with realtime sync, invitation-led access, and a
                  visual surface that stays calm while the work gets complex.
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/45">
                  Working Style
                </p>
                <p className="max-w-md text-xl font-medium leading-8 text-white">
                  Built for planning sessions, design reviews, and async thinking without the usual visual clutter.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 sm:gap-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Realtime
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">Shared instantly</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Private
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">Invite only</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Minimal
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">Quiet interface</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="mx-auto w-full max-w-[460px] rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.94),rgba(8,8,8,0.84))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur sm:p-10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-black tracking-[0.18em] text-white">
                LC
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  {eyebrow}
                </p>
                <p className="mt-1 text-sm text-white/70">Private realtime whiteboards</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="max-w-lg text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[2.5rem]">
                {title}
              </h2>
              <p className="max-w-md text-sm leading-7 text-slate-400">{description}</p>
            </div>

            <div className="mt-8 rounded-[32px] border border-white/10 bg-black/20 p-5 sm:p-6">
              {children}
            </div>

            <div className="mt-8 border-t border-white/10 pt-5 text-sm text-slate-400">
              Need a different path?{' '}
              <Link
                href={alternateHref}
                className="font-semibold text-white transition hover:text-white/70"
              >
                {alternateLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};
