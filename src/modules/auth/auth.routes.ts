import { Router } from 'express';

import { login, me, refresh, signup } from './auth.controller';
import { loginSchema, meSchema, refreshSchema, signupSchema } from './auth.types';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate-request';

export const authRouter = Router();

authRouter.post('/signup', validateRequest(signupSchema), signup);
authRouter.post('/login', validateRequest(loginSchema), login);
authRouter.post('/refresh', validateRequest(refreshSchema), refresh);
authRouter.get('/me', authenticate, validateRequest(meSchema), me);
