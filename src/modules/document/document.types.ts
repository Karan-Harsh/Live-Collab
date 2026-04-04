import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(100_000).default(''),
    isShared: z.boolean().optional().default(false),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const getDocumentParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export const listDocumentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateDocumentSchema = z.object({
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

export const deleteDocumentParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>['body'];
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>['body'];
export type GetDocumentParams = z.infer<typeof getDocumentParamsSchema>['params'];
export type DeleteDocumentParams = z.infer<typeof deleteDocumentParamsSchema>['params'];
