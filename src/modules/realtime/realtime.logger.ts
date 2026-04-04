export const logRealtimeEvent = (message: string, meta: Record<string, unknown> = {}): void => {
  console.info(`[realtime] ${message}`, meta);
};
