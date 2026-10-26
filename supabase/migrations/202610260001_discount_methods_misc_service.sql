-- Support percentage and fixed-dollar client discounts and seed a flexible Miscellaneous service.
-- Existing percentage discounts remain unchanged.

alter table public.client_discounts
  add column if not exists discount_method text not null default 'percent',
  add column if not exists discount_amount numeric(10,2);

alter table public.client_discounts
  alter column discount_percent drop not null;

alter table public.client_discounts
  drop constraint if exists client_discounts_discount_percent_check;

alter table public.client_discounts
  drop constraint if exists client_discounts_discount_method_check;

alter table public.client_discounts
  drop constraint if exists client_discounts_discount_value_valid;

alter table public.client_discounts
  add constraint client_discounts_discount_method_check
    check (discount_method in ('percent', 'fixed')),
  add constraint client_discounts_discount_value_valid
    check (
      (discount_method = 'percent'
        and discount_percent is not null
        and discount_percent > 0
        and discount_percent <= 100
        and discount_amount is null)
      or
      (discount_method = 'fixed'
        and discount_amount is not null
        and discount_amount > 0
        and discount_percent is null)
    );

-- Keep the actual mix of percentage and fixed-dollar discounts in each charge snapshot.
alter table public.appointment_charges
  add column if not exists discount_breakdown jsonb not null default '[]'::jsonb;

-- Every account gets an editable catalog entry that can be used for one-off,
-- custom-described work with an appointment-specific price.
insert into public.service_types
  (owner_id, name, pricing_method, price, default_service_minutes, is_tuning, is_active)
select
  users.id, 'Miscellaneous', 'flat_rate', 0, null, false, true
from auth.users as users
on conflict (owner_id, name) do nothing;

create or replace function public.create_default_miscellaneous_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_types
    (owner_id, name, pricing_method, price, default_service_minutes, is_tuning, is_active)
  values
    (new.id, 'Miscellaneous', 'flat_rate', 0, null, false, true)
  on conflict (owner_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_create_miscellaneous_service on auth.users;
create trigger on_auth_user_create_miscellaneous_service
  after insert on auth.users
  for each row execute function public.create_default_miscellaneous_service();
