-- ============================================
-- Parfume Split Platform - Database Schema
-- ============================================

-- 1. USERS TABLE
-- Synced from Supabase Auth via trigger
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users: anyone can read" on public.users
  for select using (true);

create policy "Users: can update own profile" on public.users
  for update using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. PERFUMES TABLE
create table public.perfumes (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.perfumes enable row level security;

create policy "Perfumes: anyone can read" on public.perfumes
  for select using (true);

create policy "Perfumes: authenticated can create" on public.perfumes
  for insert with check (auth.role() = 'authenticated');

-- 3. SPLITS TABLE
create type public.split_status as enum ('open', 'full', 'decanting', 'shipped', 'completed');

create table public.splits (
  id uuid primary key default gen_random_uuid(),
  perfume_id uuid not null references public.perfumes(id) on delete cascade,
  bottle_size_ml integer not null,
  split_size_ml integer not null,
  total_slots integer not null,
  filled_slots integer not null default 0,
  price_per_slot integer not null, -- harga dalam Rupiah
  batch_code text,
  bottle_photo_url text,
  batch_code_photo_url text,
  decant_video_url text,
  status public.split_status not null default 'open',
  description text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),

  constraint valid_slots check (filled_slots >= 0 and filled_slots <= total_slots),
  constraint valid_sizes check (bottle_size_ml > 0 and split_size_ml > 0),
  constraint valid_price check (price_per_slot > 0)
);

alter table public.splits enable row level security;

create policy "Splits: anyone can read" on public.splits
  for select using (true);

create policy "Splits: authenticated can create" on public.splits
  for insert with check (auth.uid() = created_by);

create policy "Splits: creator can update" on public.splits
  for update using (auth.uid() = created_by);

-- 4. SPLIT SLOTS TABLE
create table public.split_slots (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  user_id uuid not null references public.users(id),
  quantity integer not null default 1,
  created_at timestamptz not null default now(),

  constraint valid_quantity check (quantity > 0)
);

alter table public.split_slots enable row level security;

create policy "Split slots: anyone can read" on public.split_slots
  for select using (true);

create policy "Split slots: authenticated can create" on public.split_slots
  for insert with check (auth.uid() = user_id);

-- 5. ORDERS TABLE
create type public.order_status as enum ('pending', 'confirmed', 'decanting', 'shipped', 'completed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  split_id uuid not null references public.splits(id) on delete cascade,
  slots_purchased integer not null,
  total_price integer not null,
  status public.order_status not null default 'pending',
  shipping_receipt text,
  created_at timestamptz not null default now(),

  constraint valid_order check (slots_purchased > 0 and total_price > 0)
);

alter table public.orders enable row level security;

create policy "Orders: user can read own" on public.orders
  for select using (auth.uid() = user_id);

create policy "Orders: split creator can read" on public.orders
  for select using (
    exists (
      select 1 from public.splits
      where splits.id = orders.split_id
      and splits.created_by = auth.uid()
    )
  );

create policy "Orders: authenticated can create" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "Orders: split creator can update" on public.orders
  for update using (
    exists (
      select 1 from public.splits
      where splits.id = orders.split_id
      and splits.created_by = auth.uid()
    )
  );

-- 6. REVIEWS TABLE
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  split_id uuid not null references public.splits(id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),

  constraint valid_rating check (rating >= 1 and rating <= 5),
  unique(user_id, split_id)
);

alter table public.reviews enable row level security;

create policy "Reviews: anyone can read" on public.reviews
  for select using (true);

create policy "Reviews: user can create own" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "Reviews: user can update own" on public.reviews
  for update using (auth.uid() = user_id);

-- 7. FUNCTION: Join split (atomic, prevents overselling)
create or replace function public.join_split(
  p_split_id uuid,
  p_user_id uuid,
  p_quantity integer
)
returns uuid as $$
declare
  v_split record;
  v_order_id uuid;
begin
  -- Lock the split row to prevent race conditions
  select * into v_split
  from public.splits
  where id = p_split_id
  for update;

  if v_split is null then
    raise exception 'Split tidak ditemukan';
  end if;

  if v_split.status != 'open' then
    raise exception 'Split sudah tidak menerima pesanan';
  end if;

  if v_split.filled_slots + p_quantity > v_split.total_slots then
    raise exception 'Slot tidak cukup. Tersisa % slot.', v_split.total_slots - v_split.filled_slots;
  end if;

  -- Create split slot
  insert into public.split_slots (split_id, user_id, quantity)
  values (p_split_id, p_user_id, p_quantity);

  -- Create order
  insert into public.orders (user_id, split_id, slots_purchased, total_price)
  values (p_user_id, p_split_id, p_quantity, p_quantity * v_split.price_per_slot)
  returning id into v_order_id;

  -- Update filled slots
  update public.splits
  set filled_slots = filled_slots + p_quantity,
      status = case
        when filled_slots + p_quantity >= total_slots then 'full'::public.split_status
        else status
      end
  where id = p_split_id;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- 8. STORAGE BUCKETS (run in Supabase dashboard or via API)
-- Note: Storage buckets need to be created via Supabase dashboard:
-- - perfume_images (public)
-- - decant_videos (public)

-- 9. INDEXES
create index idx_splits_status on public.splits(status);
create index idx_splits_created_by on public.splits(created_by);
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_split_id on public.orders(split_id);
create index idx_reviews_split_id on public.reviews(split_id);
create index idx_split_slots_split_id on public.split_slots(split_id);
