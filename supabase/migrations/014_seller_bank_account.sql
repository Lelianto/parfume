-- Add bank account info for sellers (untuk info transfer pembayaran)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_name text;
