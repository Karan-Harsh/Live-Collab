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
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="flex min-h-[720px] items-center rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.9),rgba(7,7,7,0.82))] px-8 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.38)] backdrop-blur sm:px-10 xl:px-14">
          <div className="mx-auto flex w-full max-w-[680px] flex-col gap-10">
            <div className="space-y-6">
              <Badge className="w-fit border-white/10 bg-white/[0.05] text-white/85">
                Private collaborative whiteboards
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-5xl xl:text-[5.25rem]">
                  Calm space for teams that need to think visually.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Sketch, map, and align inside a focused board that stays private by default and
                  feels more like a workspace than a busy dashboard.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
                  Realtime
                </p>
                <p className="mt-4 text-lg font-semibold text-white">Live board sync</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Changes land quickly for everyone in the room.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
                  Private
                </p>
                <p className="mt-4 text-lg font-semibold text-white">Invite-only access</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Boards stay with the people you explicitly bring in.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
                  Focused
                </p>
                <p className="mt-4 text-lg font-semibold text-white">Minimal interface</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The board stays central instead of competing with chrome.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.92),rgba(8,8,8,0.82))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.34)] backdrop-blur xl:p-10">
            <div className="mb-8 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
                {eyebrow}
              </p>
              <h2 className="max-w-lg text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.4rem]">
                {title}
              </h2>
              <p className="max-w-md text-sm leading-7 text-slate-400">{description}</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/20 p-5 sm:p-6">
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
          </div>
        </section>
      </div>
    </AppShell>
  );
};
