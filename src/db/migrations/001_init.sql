-- Database Schema Design
-- This file is used for both docker entrypoint and manual migration.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assets Table
-- Defines the types of specific credits (e.g., 'Gold Coins', 'Reward Points').
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'gold_coins'
    name VARCHAR(100) NOT NULL,
    scale INT DEFAULT 0, -- Decimals, usually 0 for points, 2 for currency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Accounts Table
-- Represents a wallet for a specific user and asset.
-- "System" accounts (e.g., Treasury) will have a NULL user_id or special flag.
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id), -- Nullable for System Accounts
    asset_id UUID REFERENCES assets(id) NOT NULL,
    balance DECIMAL(20, 0) NOT NULL DEFAULT 0, -- Using DECIMAL for precision. 20,0 fits BIGINT/Points.
    type VARCHAR(20) CHECK (type IN ('USER', 'SYSTEM')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONSTRAINT: Balance must never be negative.
    CONSTRAINT check_balance_non_negative CHECK (balance >= 0),
    
    -- Ensure one account per asset per user
    UNIQUE(user_id, asset_id)
);

-- 4. Ledger Entries Table (Double-Entry Ledger)
-- Every financial movement is recorded here.
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL, -- Groups related entries (Debit+Credit)
    account_id UUID REFERENCES accounts(id) NOT NULL,
    amount DECIMAL(20, 0) NOT NULL, -- Negative for Debit, Positive for Credit
    balance_after DECIMAL(20, 0) NOT NULL, -- Snapshot of balance for audit
    type VARCHAR(10) CHECK (type IN ('DEBIT', 'CREDIT')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at);

-- 5. Idempotency Keys Table
-- Ensures requests are processed only once.
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    response_code INT,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
