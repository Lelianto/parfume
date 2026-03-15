-- Add shipping address fields to orders
ALTER TABLE orders
  ADD COLUMN shipping_name text,
  ADD COLUMN shipping_phone text,
  ADD COLUMN shipping_province text,
  ADD COLUMN shipping_city text,
  ADD COLUMN shipping_district text,
  ADD COLUMN shipping_village text,
  ADD COLUMN shipping_postal_code text,
  ADD COLUMN shipping_address text;

-- Add default address fields to users for reuse
ALTER TABLE users
  ADD COLUMN address_name text,
  ADD COLUMN address_phone text,
  ADD COLUMN address_province text,
  ADD COLUMN address_city text,
  ADD COLUMN address_district text,
  ADD COLUMN address_village text,
  ADD COLUMN address_postal_code text,
  ADD COLUMN address_detail text;
