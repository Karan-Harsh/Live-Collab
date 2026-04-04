import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { allowedCorsOrigins } from './config/cors';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { requestLogger } from './middleware/request-logger';
import { authRouter } from './modules/auth/auth.routes';
import { invitationRouter } from './modules/invitation/invitation.routes';
import { userRouter } from './modules/user/user.routes';
import { whiteboardRouter } from './modules/whiteboard/whiteboard.routes';
import { sendSuccess } from './utils/response';

export const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: allowedCorsOrigins,
    credentials: true,
  }),
);
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_request: Request, response: Response) => {
  sendSuccess(response, 200, {
    status: 'ok',
  });
});

app.use('/auth', authRouter);
app.use('/invitations', invitationRouter);
app.use('/api/v1/invitations', invitationRouter);
app.use('/api/v1/users', userRouter);
app.use('/whiteboards', whiteboardRouter);
app.use('/api/v1/whiteboards', whiteboardRouter);
app.use('/documents', whiteboardRouter);
app.use('/api/v1/documents', whiteboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);
