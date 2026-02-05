-- Add asset_class to wealth_assets for classification (ETF, Private Equity, Alternative, etc.)
ALTER TABLE wealth_assets ADD COLUMN IF NOT EXISTS asset_class TEXT;
