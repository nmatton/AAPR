import { Router } from 'express';
import { getTags } from '../controllers/tags.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use(requireAuth);
router.get('/', getTags);

export default router;
