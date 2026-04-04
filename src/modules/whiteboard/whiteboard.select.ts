import type { Prisma } from '@prisma/client';

export const whiteboardSelect = {
  id: true,
  title: true,
  content: true,
  isShared: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhiteboardSelect;

export type WhiteboardView = Prisma.WhiteboardGetPayload<{
  select: typeof whiteboardSelect;
}>;
