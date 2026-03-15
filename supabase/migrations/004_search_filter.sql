-- ============================================
-- Search & Filter: concentration + full-text search
-- ============================================

-- 1. Add concentration to perfumes
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS concentration text;

-- 2. Full-text search index
CREATE INDEX IF NOT EXISTS idx_perfumes_fts
  ON public.perfumes
  USING GIN(to_tsvector('simple', coalesce(brand, '') || ' ' || coalesce(name, '')));

-- 3. Index on brand for filter
CREATE INDEX IF NOT EXISTS idx_perfumes_brand ON public.perfumes(brand);

-- 4. Index on concentration
CREATE INDEX IF NOT EXISTS idx_perfumes_concentration ON public.perfumes(concentration);
