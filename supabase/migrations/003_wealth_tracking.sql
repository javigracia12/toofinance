-- Wealth tracking tables

-- Monthly snapshots (one per user per year/month)
-- month 0 = "end of previous year" (starting position for the year)
-- month 1-12 = January through December
CREATE TABLE wealth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- Cash accounts (bank accounts, etc.)
CREATE TABLE wealth_cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES wealth_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Assets (stocks, crypto, property, etc.)
CREATE TABLE wealth_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES wealth_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Debts (mortgage, loans, credit cards, etc.)
CREATE TABLE wealth_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES wealth_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Earnings sources (salary, side hustle, dividends, etc.)
CREATE TABLE wealth_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES wealth_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Investments made (per asset, to calculate performance per asset)
CREATE TABLE wealth_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES wealth_snapshots(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,  -- should match an asset name
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- RLS policies
ALTER TABLE wealth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_investments ENABLE ROW LEVEL SECURITY;

-- Snapshots: users can only access their own
CREATE POLICY "Users can manage own snapshots" ON wealth_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- For child tables, check via snapshot ownership
CREATE POLICY "Users can manage own cash accounts" ON wealth_cash_accounts
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own assets" ON wealth_assets
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own debts" ON wealth_debts
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own earnings" ON wealth_earnings
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own investments" ON wealth_investments
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_wealth_snapshots_user_year ON wealth_snapshots(user_id, year);
CREATE INDEX idx_wealth_cash_snapshot ON wealth_cash_accounts(snapshot_id);
CREATE INDEX idx_wealth_assets_snapshot ON wealth_assets(snapshot_id);
CREATE INDEX idx_wealth_debts_snapshot ON wealth_debts(snapshot_id);
CREATE INDEX idx_wealth_earnings_snapshot ON wealth_earnings(snapshot_id);
CREATE INDEX idx_wealth_investments_snapshot ON wealth_investments(snapshot_id);
