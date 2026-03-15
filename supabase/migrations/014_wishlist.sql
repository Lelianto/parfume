-- Wishlist / watchlist feature
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  split_id uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_unique UNIQUE (user_id, split_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wishlists: user can read own" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Wishlists: user can insert own" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Wishlists: user can delete own" ON public.wishlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON public.wishlists (user_id);
CREATE INDEX IF NOT EXISTS wishlists_split_id_idx ON public.wishlists (split_id);
