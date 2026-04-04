import { z } from 'zod';

export const createWhiteboardSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(5_000_000).default(''),
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
      content: z.string().max(5_000_000).optional(),
    })
    .refine((data) => data.title !== undefined || data.content !== undefined, {
      message: 'At least one field must be provided.',
    }),
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

export interface WhiteboardPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageAccess: boolean;
}

export interface WhiteboardResponse {
  id: string;
  title: string;
  content: string;
  version: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  accessRole: 'owner' | 'collaborator';
  permissions: WhiteboardPermissions;
  collaborators: Array<{
    id: string;
    userId: string;
    role: 'EDITOR';
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
  pendingInvites: Array<{
    id: string;
    whiteboardId: string;
    inviterId: string;
    recipientId: string;
    status: 'PENDING';
    respondedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    inviter: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
    recipient: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}
