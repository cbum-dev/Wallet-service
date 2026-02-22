import type { Request, Response, NextFunction } from 'express';
import walletService from '../services/wallet.service.ts';
import pool from '../config/db.ts';

// For seeding
const SYSTEM_TREASURY_ACCOUNT = '55555555-5555-5555-5555-555555555555';

class WalletController {
  
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const balances = await walletService.getUserBalances(userId);
      
      res.status(200).json({
        success: true,
        data: balances
      });
    } catch (error) {
      next(error);
    }
  }

  async transact(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, amount, assetSlug, type } = req.body;
      
      if (!userId || !amount || !assetSlug || !type) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const userAccount = await walletService.getAccountByUserAndAsset(userId, assetSlug);
      if (!userAccount) {
        return res.status(404).json({ success: false, message: 'User wallet not found for asset' });
      }
      
      const userAccountId = userAccount.id;
      let sourceAccountId = '';
      let destAccountId = '';
      let description = '';

      if (type === 'TOPUP') {
        sourceAccountId = SYSTEM_TREASURY_ACCOUNT;
        destAccountId = userAccountId;
        description = 'Topup via Purchase';
      } else if (type === 'BONUS') {
        sourceAccountId = SYSTEM_TREASURY_ACCOUNT;
        destAccountId = userAccountId;
        description = 'System Bonus';
      } else if (type === 'SPEND') {
        sourceAccountId = userAccountId;
        destAccountId = SYSTEM_TREASURY_ACCOUNT;
        description = 'In-game Purchase/Spend';
      } else {
        return res.status(400).json({ success: false, message: 'Invalid transaction type' });
      }

      const result = await walletService.transfer(
        sourceAccountId,
        destAccountId,
        Number(amount),
        description
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Insufficient funds') {
        return res.status(400).json({ success: false, message: 'Insufficient funds' });
      }
      next(error);
    }
  }
}

export default new WalletController();
