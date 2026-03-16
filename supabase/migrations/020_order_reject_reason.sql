-- Add reject_reason column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reject_reason text;
