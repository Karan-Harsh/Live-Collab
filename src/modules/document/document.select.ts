import type { Prisma } from '@prisma/client';

export const documentSelect = {
  id: true,
  title: true,
  content: true,
  isShared: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

export type DocumentView = Prisma.DocumentGetPayload<{
  select: typeof documentSelect;
}>;
