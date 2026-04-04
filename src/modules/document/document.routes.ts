import { Router } from 'express';

import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  updateDocument,
} from './document.controller';
import {
  createDocumentSchema,
  deleteDocumentParamsSchema,
  getDocumentParamsSchema,
  listDocumentsSchema,
  updateDocumentSchema,
} from './document.types';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate-request';

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.post('/', validateRequest(createDocumentSchema), createDocument);
documentRouter.get('/', validateRequest(listDocumentsSchema), listDocuments);
documentRouter.get('/:id', validateRequest(getDocumentParamsSchema), getDocumentById);
documentRouter.patch('/:id', validateRequest(updateDocumentSchema), updateDocument);
documentRouter.delete('/:id', validateRequest(deleteDocumentParamsSchema), deleteDocument);
