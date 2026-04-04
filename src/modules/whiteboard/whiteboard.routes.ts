import { Router } from 'express';

import {
  createWhiteboard,
  deleteWhiteboard,
  getWhiteboardById,
  listWhiteboards,
  updateWhiteboard,
} from './whiteboard.controller';
import {
  createWhiteboardSchema,
  deleteWhiteboardParamsSchema,
  getWhiteboardParamsSchema,
  listWhiteboardsSchema,
  updateWhiteboardSchema,
} from './whiteboard.types';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate-request';

export const whiteboardRouter = Router();

whiteboardRouter.use(authenticate);

whiteboardRouter.post('/', validateRequest(createWhiteboardSchema), createWhiteboard);
whiteboardRouter.get('/', validateRequest(listWhiteboardsSchema), listWhiteboards);
whiteboardRouter.get('/:id', validateRequest(getWhiteboardParamsSchema), getWhiteboardById);
whiteboardRouter.patch('/:id', validateRequest(updateWhiteboardSchema), updateWhiteboard);
whiteboardRouter.delete('/:id', validateRequest(deleteWhiteboardParamsSchema), deleteWhiteboard);
