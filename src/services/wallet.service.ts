import type { PoolClient } from 'pg';
import { withTransaction } from '../utils/transaction.ts';
import pool from '../config/db.ts';

export class WalletService {
  
  async getUserBalances(userId: string): Promise<any[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT a.id, a.balance, ast.slug, ast.name 
        FROM accounts a
        JOIN assets ast ON a.asset_id = ast.id
        WHERE a.user_id = $1
      `, [userId]);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async getAccountByUserAndAsset(userId: string, assetSlug: string): Promise<any> {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT a.id 
        FROM accounts a
        JOIN assets ast ON a.asset_id = ast.id
        WHERE a.user_id = $1 AND ast.slug = $2
      `, [userId, assetSlug]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Performs an atomic transfer between two accounts.
   * Handles locking to prevent race conditions.
   * @param sourceAccountId - ID of the account sending funds
   * @param destAccountId - ID of the account receiving funds
   * @param amount - Amount to transfer
   * @param description - Description of the transfer
   */
  async transfer(
    sourceAccountId: string,
    destAccountId: string,
    amount: number,
    description: string
  ): Promise<any> {
    
    if (amount <= 0) throw new Error("Transfer amount must be positive");
    if (sourceAccountId === destAccountId) throw new Error("Cannot transfer to self");

    return withTransaction(async (client) => {
      // 1. Lock Accounts in Deterministic Order to avoid Deadlocks
      const firstId = sourceAccountId < destAccountId ? sourceAccountId : destAccountId;
      const secondId = sourceAccountId < destAccountId ? destAccountId : sourceAccountId;

      // Lock both accounts
      const lockRes = await client.query(
        `SELECT id, balance, type FROM accounts WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
        [firstId, secondId]
      );

      if (lockRes.rows.length !== 2) {
        throw new Error("One or both accounts not found");
      }

      const accountMap = new Map(lockRes.rows.map((r: any) => [r.id, r]));
      const sourceAccount = accountMap.get(sourceAccountId);
      const destAccount = accountMap.get(destAccountId);

      if (!sourceAccount || !destAccount) throw new Error("Account lookup failed");

      // 2. Check Balance
      const currentBalance = parseFloat(sourceAccount.balance);
      if (currentBalance < amount) {
        throw new Error("Insufficient funds");
      }

      // 3. Update Balances
      const newSourceBalance = currentBalance - amount;
      await client.query(
        `UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newSourceBalance, sourceAccountId]
      );

      const newDestBalance = parseFloat(destAccount.balance) + amount;
      await client.query(
        `UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [newDestBalance, destAccountId]
      );

      // 4. Record Ledger Entries
      const transactionId = await this.recordLedger(
        client,
        sourceAccountId,
        destAccountId,
        amount,
        newSourceBalance,
        newDestBalance,
        description
      );

      return {
        transactionId,
        status: 'COMPLETED',
        amount,
        sourceStart: currentBalance,
        sourceEnd: newSourceBalance
      };
    });
  }

  private async recordLedger(
    client: PoolClient,
    sourceId: string,
    destId: string,
    amount: number,
    sourceParamsBalance: number,
    destParamsBalance: number,
    description: string
  ): Promise<string> {
    const transactionIdRes = await client.query(`SELECT gen_random_uuid() as tid`);
    const transactionId = transactionIdRes.rows[0].tid;

    // Debit Entry
    await client.query(
      `INSERT INTO ledger_entries (
        transaction_id, account_id, amount, balance_after, description, type
      ) VALUES ($1, $2, $3, $4, $5, 'DEBIT')`,
      [transactionId, sourceId, -amount, sourceParamsBalance, description]
    );

    // Credit Entry
    await client.query(
      `INSERT INTO ledger_entries (
        transaction_id, account_id, amount, balance_after, description, type
      ) VALUES ($1, $2, $3, $4, $5, 'CREDIT')`,
      [transactionId, destId, amount, destParamsBalance, description]
    );

    return transactionId;
  }
}

export default new WalletService();
