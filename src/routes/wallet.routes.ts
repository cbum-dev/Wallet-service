import { Router } from 'express';
import walletController from '../controllers/wallet.controller.ts';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware.ts';

const router = Router();

router.get('/balance/:userId', walletController.getBalance); 

router.post('/transact', idempotencyMiddleware, walletController.transact);

export default router;
