-- Add brand_type, gender, scent_classification to perfumes
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS brand_type text;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS scent_classification text;

-- Admin-managed form options table
CREATE TABLE IF NOT EXISTS public.form_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,  -- 'brand', 'scent_classification', 'brand_type', 'gender'
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, value)
);

ALTER TABLE public.form_options ENABLE ROW LEVEL SECURITY;

-- Everyone can read options
CREATE POLICY "form_options_read" ON public.form_options
  FOR SELECT USING (true);

-- Only admin can insert/update/delete
CREATE POLICY "form_options_admin_write" ON public.form_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
