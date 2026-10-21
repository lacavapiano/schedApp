-- schedApp financial records and private receipt storage
-- Run this migration in the Supabase SQL Editor before using the Expenses tab.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  vendor text not null default '',
  description text not null default '',
  category text not null default 'Other',
  amount numeric(12,2) not null check (amount >= 0),
  business_use_percent numeric(5,2) not null default 100 check (business_use_percent >= 0 and business_use_percent <= 100),
  deductible boolean not null default true,
  payment_method text not null default '',
  notes text not null default '',
  receipt_path text,
  receipt_name text,
  receipt_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_owner_date_idx on public.expenses(owner_id, expense_date desc);
alter table public.expenses enable row level security;
drop policy if exists "Users manage their own expenses" on public.expenses;
create policy "Users manage their own expenses" on public.expenses
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, insert, update, delete on public.expenses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-receipts', 'expense-receipts', false, 12582912,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = 12582912,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users access their own expense receipts" on storage.objects;
create policy "Users access their own expense receipts" on storage.objects
  for all to authenticated
  using (bucket_id = 'expense-receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'expense-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
