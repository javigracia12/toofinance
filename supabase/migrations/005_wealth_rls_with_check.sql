-- Add WITH CHECK to wealth tables so INSERT works correctly
-- (USING alone may not suffice for INSERT in some RLS configurations)

-- Fix the snapshots table first (this was missing!)
DROP POLICY IF EXISTS "Users can manage own snapshots" ON wealth_snapshots;
CREATE POLICY "Users can manage own snapshots" ON wealth_snapshots
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own cash accounts" ON wealth_cash_accounts;
CREATE POLICY "Users can manage own cash accounts" ON wealth_cash_accounts
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()))
  WITH CHECK (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own assets" ON wealth_assets;
CREATE POLICY "Users can manage own assets" ON wealth_assets
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()))
  WITH CHECK (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own debts" ON wealth_debts;
CREATE POLICY "Users can manage own debts" ON wealth_debts
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()))
  WITH CHECK (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own earnings" ON wealth_earnings;
CREATE POLICY "Users can manage own earnings" ON wealth_earnings
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()))
  WITH CHECK (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own investments" ON wealth_investments;
CREATE POLICY "Users can manage own investments" ON wealth_investments
  FOR ALL USING (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()))
  WITH CHECK (snapshot_id IN (SELECT id FROM wealth_snapshots WHERE user_id = auth.uid()));
