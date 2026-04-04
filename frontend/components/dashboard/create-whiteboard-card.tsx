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
    <div className="rounded-[28px] border border-white/10 bg-panel/80 p-6 backdrop-blur">
      <div className="mb-5 flex flex-col gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
            New Whiteboard
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Start a fresh collaboration space
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            New boards start private and can be shared later through in-app invitations.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Product discovery board"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button
          onClick={() => void handleSubmit()}
          disabled={isPending || title.trim().length === 0}
        >
          {isPending ? 'Creating...' : 'Create & Open'}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
};
