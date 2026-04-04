import { z } from 'zod';

export const createWhiteboardSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(100_000).default(''),
    isShared: z.boolean().optional().default(false),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const getWhiteboardParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export const listWhiteboardsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateWhiteboardSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(255).optional(),
      content: z.string().max(100_000).optional(),
      isShared: z.boolean().optional(),
    })
    .refine(
      (data) =>
        data.title !== undefined || data.content !== undefined || data.isShared !== undefined,
      {
        message: 'At least one field must be provided.',
      },
    ),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export const deleteWhiteboardParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export type CreateWhiteboardDto = z.infer<typeof createWhiteboardSchema>['body'];
export type UpdateWhiteboardDto = z.infer<typeof updateWhiteboardSchema>['body'];
export type GetWhiteboardParams = z.infer<typeof getWhiteboardParamsSchema>['params'];
export type DeleteWhiteboardParams = z.infer<typeof deleteWhiteboardParamsSchema>['params'];
