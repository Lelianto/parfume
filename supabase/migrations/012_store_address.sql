-- Add store location fields to users (for seller)
ALTER TABLE users
  ADD COLUMN store_province text,
  ADD COLUMN store_city text;
