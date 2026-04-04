import { z } from 'zod';

export const createInvitationSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export const listInvitationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const respondToInvitationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    invitationId: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>['body'];
export type CreateInvitationParams = z.infer<typeof createInvitationSchema>['params'];
export type RespondToInvitationParams = z.infer<typeof respondToInvitationSchema>['params'];
