import { AppProviders } from '@/components/providers/app-providers';

import type { PropsWithChildren } from 'react';

export const Providers = ({ children }: PropsWithChildren) => {
  return <AppProviders>{children}</AppProviders>;
};
