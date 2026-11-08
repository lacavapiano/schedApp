-- Extend the expense ledger with resale inventory and tax-preparer fields.
alter table public.expenses
  add column if not exists expense_type text not null default 'operating',
  add column if not exists quantity_purchased numeric(12,3),
  add column if not exists quantity_remaining numeric(12,3),
  add column if not exists inventory_sale_amount numeric(12,2) not null default 0,
  add column if not exists inventory_sale_date date,
  add column if not exists inventory_client_id uuid references public.clients(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_expense_type_check') then
    alter table public.expenses add constraint expenses_expense_type_check
      check (expense_type in ('operating', 'service_material', 'inventory'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_inventory_quantity_check') then
    alter table public.expenses add constraint expenses_inventory_quantity_check
      check (
        (expense_type <> 'inventory')
        or (
          quantity_purchased is not null
          and quantity_purchased > 0
          and quantity_remaining is not null
          and quantity_remaining >= 0
          and quantity_remaining <= quantity_purchased
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_inventory_sale_amount_check') then
    alter table public.expenses add constraint expenses_inventory_sale_amount_check
      check (inventory_sale_amount >= 0);
  end if;
end $$;

create index if not exists expenses_owner_type_date_idx
  on public.expenses(owner_id, expense_type, expense_date desc);
create index if not exists expenses_inventory_client_idx
  on public.expenses(inventory_client_id)
  where inventory_client_id is not null;
