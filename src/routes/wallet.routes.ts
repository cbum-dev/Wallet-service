import { Router } from 'express';
import walletController from '../controllers/wallet.controller.ts';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware.ts';

const router = Router();

// Balance endpoint
router.get('/balance/:userId', walletController.getBalance); 

// Transaction endpoint, protected by idempotency
router.post('/transact', idempotencyMiddleware, walletController.transact);

export default router;
