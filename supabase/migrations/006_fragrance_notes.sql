-- ============================================
-- Fragrance Notes: top/middle/base notes + scent family
-- ============================================

ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS top_notes text[] DEFAULT '{}';
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS middle_notes text[] DEFAULT '{}';
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS base_notes text[] DEFAULT '{}';
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS scent_family text;

CREATE INDEX IF NOT EXISTS idx_perfumes_scent_family ON public.perfumes(scent_family);
