-- Service catalog, client discounts, and appointment charge snapshots.
-- Apply in Supabase SQL Editor or through your migration workflow.

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  pricing_method text not null check (pricing_method in ('hourly', 'flat_rate')),
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.client_discounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_type_id uuid references public.service_types(id) on delete restrict,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  discount_type text not null check (discount_type in ('ongoing', 'one_time')),
  is_active boolean not null default true,
  -- One-time discounts must be deliberately assigned to an appointment or a
  -- particular appointment_pianos row. service_type_id further scopes the rule.
  applies_to_appointment_id uuid references public.appointments(id) on delete cascade,
  applies_to_appointment_piano_id uuid references public.appointment_pianos(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_discount_one_time_target check (
    (discount_type = 'ongoing'
      and applies_to_appointment_id is null
      and applies_to_appointment_piano_id is null)
    or
    (discount_type = 'one_time'
      and (applies_to_appointment_id is not null
        or applies_to_appointment_piano_id is not null))
  )
);

create index if not exists service_types_owner_active_idx
  on public.service_types(owner_id, is_active, name);
create index if not exists client_discounts_client_active_idx
  on public.client_discounts(client_id, is_active);
create index if not exists client_discounts_target_appointment_idx
  on public.client_discounts(applies_to_appointment_id)
  where applies_to_appointment_id is not null;
create index if not exists client_discounts_target_piano_idx
  on public.client_discounts(applies_to_appointment_piano_id)
  where applies_to_appointment_piano_id is not null;

create table if not exists public.appointment_charges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  appointment_piano_id uuid references public.appointment_pianos(id) on delete set null,
  service_type_id uuid references public.service_types(id) on delete set null,
  -- Snapshots intentionally remain even if the catalog entry is later edited/deactivated.
  service_name text not null,
  pricing_method text not null check (pricing_method in ('hourly', 'flat_rate')),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  billable_hours numeric(7,2),
  base_amount numeric(10,2) not null check (base_amount >= 0),
  global_discount_percent numeric(5,2) not null default 0 check (global_discount_percent between 0 and 100),
  service_discount_percent numeric(5,2) not null default 0 check (service_discount_percent between 0 and 100),
  one_time_discount_percent numeric(5,2) not null default 0 check (one_time_discount_percent between 0 and 100),
  discount_rule_ids uuid[] not null default '{}',
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  final_amount numeric(10,2) not null check (final_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_charge_hours_valid check (
    (pricing_method = 'hourly' and billable_hours is not null and billable_hours > 0)
    or (pricing_method = 'flat_rate' and (billable_hours is null or billable_hours >= 0))
  )
);

create index if not exists appointment_charges_appointment_idx
  on public.appointment_charges(appointment_id);
create index if not exists appointment_charges_owner_idx
  on public.appointment_charges(owner_id);

-- Ensure a discount's client and owner match the appointment selected for a one-time application.
-- This is checked by the API as well; RLS prevents cross-owner reads/writes.

alter table public.service_types enable row level security;
alter table public.client_discounts enable row level security;
alter table public.appointment_charges enable row level security;

drop policy if exists "Users manage their service types" on public.service_types;
create policy "Users manage their service types"
  on public.service_types for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Users manage their client discounts" on public.client_discounts;
create policy "Users manage their client discounts"
  on public.client_discounts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Users manage their appointment charges" on public.appointment_charges;
create policy "Users manage their appointment charges"
  on public.appointment_charges for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
