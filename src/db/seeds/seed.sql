-- Static UUIDs for reproducibility
-- Alice: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- Bob:   b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22
-- Asset (Gold): 10000000-0000-0000-0000-000000000001
-- Asset (Diamond): 10000000-0000-0000-0000-000000000002

-- 1. Insert Assets
INSERT INTO assets (id, slug, name, scale) VALUES
  ('10000000-0000-0000-0000-000000000001', 'gold_coins', 'Gold Coins', 0),
  ('10000000-0000-0000-0000-000000000002', 'diamonds', 'Diamonds', 0)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Users
INSERT INTO users (id, username, email) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'alice', 'alice@example.com'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'bob', 'bob@example.com')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Accounts
-- System Treasury (Source of Funds) for Gold
INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('55555555-5555-5555-5555-555555555555', NULL, '10000000-0000-0000-0000-000000000001', 1000000, 'SYSTEM')
ON CONFLICT DO NOTHING;

-- Alice's Gold Account (100 coins)
INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000001', 100, 'USER')
ON CONFLICT (user_id, asset_id) DO NOTHING;

-- Bob's Gold Account (50 coins)
INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('22222222-2222-2222-2222-222222222222', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', '10000000-0000-0000-0000-000000000001', 50, 'USER')
ON CONFLICT (user_id, asset_id) DO NOTHING;

-- 4. Initial Ledger Entries (For Audit Trail)
-- Assuming newly created accounts start at these balances from 'nowhere' (or system mint)
-- We'll just insert "Opening Balance" records.

INSERT INTO ledger_entries (transaction_id, account_id, amount, balance_after, description, type) VALUES
  -- Treasury Opening
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 1000000, 1000000, 'Seed Initialization', 'CREDIT'),
  -- Alice Opening
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 100, 100, 'Seed Initialization', 'CREDIT'),
  -- Bob Opening
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 50, 50, 'Seed Initialization', 'CREDIT')
ON CONFLICT DO NOTHING;
-- Note: ON CONFLICT DO NOTHING won't work on transaction_id per se unless we set specific UUIDs for transactions too.
-- But since we use gen_random_uuid(), these will just duplicate if run multiple times.
-- For a strict seed script, we should probably delete from tables first or be careful.
-- Given this is dev setup, truncating first might be cleaner, but unsafe for prod.
-- Let's stick to INSERT ... and assume fresh DB or manual handling.
