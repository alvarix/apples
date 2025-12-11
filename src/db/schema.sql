-- Updated schema with transaction type support
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payer VARCHAR(10) NOT NULL CHECK (payer IN ('Adam', 'Eve')),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'loan', 'settlement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON transactions(payer);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Migration: Add type column if upgrading from old schema
-- Run this manually if needed:
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'loan', 'settlement'));
