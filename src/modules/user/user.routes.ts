import { Router } from 'express';

import { getUserById, listUsers } from './user.controller';
import { getUserParamsSchema, listUsersSchema } from './user.types';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate-request';

export const userRouter = Router();

userRouter.get('/', authenticate, validateRequest(listUsersSchema), listUsers);
userRouter.get('/:userId', authenticate, validateRequest(getUserParamsSchema), getUserById);
