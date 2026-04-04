'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/error';

interface CreateDocumentCardProps {
  onCreate: (input: { title: string; content: string; isShared: boolean }) => Promise<unknown>;
  isPending: boolean;
}

export const CreateDocumentCard = ({ onCreate, isPending }: CreateDocumentCardProps) => {
  const [title, setTitle] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    try {
      await onCreate({
        title,
        content: '',
        isShared,
      });
      setTitle('');
      setIsShared(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-panel/80 p-6 backdrop-blur">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
            New Document
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Start a fresh collaboration thread
          </h2>
        </div>
        <label className="inline-flex items-center gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(event) => setIsShared(event.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent/50"
          />
          Shared with authenticated viewers
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Q2 planning brief"
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
