import { AppShell } from '@/components/app-shell';

const Loading = () => {
  return (
    <AppShell className="flex items-center justify-center">
      <div className="rounded-3xl border border-white/10 bg-panel/80 px-6 py-4 text-sm text-muted backdrop-blur">
        Loading workspace...
      </div>
    </AppShell>
  );
};

export default Loading;
