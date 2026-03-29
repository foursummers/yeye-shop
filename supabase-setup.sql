-- ============================================================
-- Yeye Shop — Supabase 建表脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 商品表
create table if not exists products (
  id text primary key,
  name text not null,
  category text default '',
  cost numeric default 0,
  taobao_price numeric default 0,
  stock integer default 0,
  location text default '工厂',
  note text default '',
  season text default 'Q1 2025',
  images text[] default '{}',
  description text default '',
  recommended boolean default false,
  hidden boolean default false,
  created_at timestamptz default now()
);

-- 2. 订单表
create table if not exists orders (
  id text primary key,
  product_id text references products(id) on delete set null,
  quantity integer default 1,
  wechat text default '',
  customer_name text default '',
  phone text default '',
  address text default '',
  note text default '',
  status text default 'pending',
  paid_amount numeric default 0,
  order_date text default '',
  order_time text default '',
  created_at timestamptz default now()
);

-- 3. 开放匿名读写（简易方案，适合内部使用）
alter table products enable row level security;
alter table orders enable row level security;

create policy "Allow all on products" on products for all using (true) with check (true);
create policy "Allow all on orders" on orders for all using (true) with check (true);

-- 4. 创建图片存储桶（公开读取）
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 5. 存储桶策略：任何人可上传/读取
create policy "Public read product-images" on storage.objects for select using (bucket_id = 'product-images');
create policy "Anyone upload product-images" on storage.objects for insert with check (bucket_id = 'product-images');
create policy "Anyone update product-images" on storage.objects for update using (bucket_id = 'product-images');
create policy "Anyone delete product-images" on storage.objects for delete using (bucket_id = 'product-images');
