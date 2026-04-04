import Link from 'next/link';

import { AppShell } from '@/components/app-shell';

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
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="relative flex min-h-[720px] items-center overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.95),rgba(8,8,8,0.9))] px-8 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.42)] sm:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(255,255,255,0.045),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
          <div className="relative mx-auto flex w-full max-w-[640px] flex-col justify-between gap-20">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-black tracking-[0.18em] text-white">
                  LC
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
                    Live Collab
                  </p>
                  <p className="mt-1 text-sm text-white/70">Private realtime whiteboards</p>
                </div>
              </div>

              <div className="space-y-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  Minimal workspace for focused teams
                </p>
                <h1 className="max-w-3xl text-[3.35rem] font-semibold leading-[0.94] tracking-[-0.065em] text-white sm:text-[4.25rem] xl:text-[4.8rem]">
                  Whiteboards that feel calm, precise, and ready for serious work.
                </h1>
                <p className="max-w-[560px] text-base leading-8 text-slate-300 sm:text-lg">
                  Invite the right people, sketch in real time, and keep the interface quiet enough
                  for actual thinking.
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              <div className="space-y-2 rounded-[26px] border border-white/8 bg-white/[0.025] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Realtime
                </p>
                <p className="text-lg font-medium text-white">Shared instantly</p>
                <p className="text-sm leading-6 text-slate-400">
                  Updates appear the moment collaborators move on the board.
                </p>
              </div>
              <div className="space-y-2 rounded-[26px] border border-white/8 bg-white/[0.025] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Access
                </p>
                <p className="text-lg font-medium text-white">Invite only</p>
                <p className="text-sm leading-6 text-slate-400">
                  Boards stay private until the owner brings someone in.
                </p>
              </div>
              <div className="space-y-2 rounded-[26px] border border-white/8 bg-white/[0.025] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Interface
                </p>
                <p className="text-lg font-medium text-white">Monochrome</p>
                <p className="text-sm leading-6 text-slate-400">
                  A restrained visual system that keeps attention on the work.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="mx-auto w-full max-w-[460px] rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.95),rgba(8,8,8,0.86))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur sm:p-10">
            <div className="mb-8 flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-black tracking-[0.18em] text-white">
                LC
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                  {eyebrow}
                </p>
                <h2 className="max-w-lg text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[2.4rem]">
                  {title}
                </h2>
                <p className="max-w-md text-sm leading-7 text-slate-400">{description}</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-5 sm:p-6">
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
