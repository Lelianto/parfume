-- Add is_hidden column to splits for visibility toggle
ALTER TABLE splits ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
