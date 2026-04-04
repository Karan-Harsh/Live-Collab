'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';

interface CreateWhiteboardCardProps {
  onCreate: (input: { title: string; content: string }) => Promise<unknown>;
  isPending: boolean;
}

export const CreateWhiteboardCard = ({ onCreate, isPending }: CreateWhiteboardCardProps) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    try {
      await onCreate({
        title,
        content: '',
      });
      setTitle('');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,32,0.88),rgba(9,19,29,0.76))] p-6 shadow-[0_30px_100px_rgba(2,6,23,0.34)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(246,193,119,0.08),transparent_24%)]" />
      <div className="relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-accent">
              New Whiteboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
              Open a fresh board for the next working session.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Start with a private canvas and invite only the people who should shape the room.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            Canvas tools ready: notes, drawing, shapes, images
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="Quarterly product strategy board"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button
            className="min-w-[180px]"
            onClick={() => void handleSubmit()}
            disabled={isPending || title.trim().length === 0}
          >
            {isPending ? 'Creating...' : 'Create board'}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
};
