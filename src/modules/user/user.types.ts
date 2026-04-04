import { z } from 'zod';

export const getUserParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    userId: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

export const listUsersSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export type GetUserParams = z.infer<typeof getUserParamsSchema>['params'];
