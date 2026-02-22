INSERT INTO assets (id, slug, name, scale) VALUES
  ('10000000-0000-0000-0000-000000000001', 'gold_coins', 'Gold Coins', 0),
  ('10000000-0000-0000-0000-000000000002', 'diamonds', 'Diamonds', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, username, email) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'alice', 'alice@example.com'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'bob', 'bob@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('55555555-5555-5555-5555-555555555555', NULL, '10000000-0000-0000-0000-000000000001', 1000000, 'SYSTEM')
ON CONFLICT DO NOTHING;

INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10000000-0000-0000-0000-000000000001', 100, 'USER')
ON CONFLICT (user_id, asset_id) DO NOTHING;

INSERT INTO accounts (id, user_id, asset_id, balance, type) VALUES
  ('22222222-2222-2222-2222-222222222222', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', '10000000-0000-0000-0000-000000000001', 50, 'USER')
ON CONFLICT (user_id, asset_id) DO NOTHING;


INSERT INTO ledger_entries (transaction_id, account_id, amount, balance_after, description, type) VALUES
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 1000000, 1000000, 'Seed Initialization', 'CREDIT'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 100, 100, 'Seed Initialization', 'CREDIT'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 50, 50, 'Seed Initialization', 'CREDIT')
ON CONFLICT DO NOTHING;

