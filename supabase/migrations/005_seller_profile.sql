-- ============================================
-- Seller Profile: bio, whatsapp, city
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city text;
