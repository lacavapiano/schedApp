alter table public.service_types
  add column if not exists is_tuning boolean not null default false;

-- These established service names represent tuning visits by default.
-- Their flags remain editable in the Service Catalog.
update public.service_types
set is_tuning = true,
    updated_at = now()
where lower(trim(name)) in (
  'standard service visit',
  'concert',
  'concert tuning',
  'pitch correction'
);
