-- Grant the authenticated Supabase role the table privileges required by the pricing API.
-- Row-level security policies continue to restrict each user's rows.
grant select, insert, update, delete on table
  public.service_types,
  public.client_discounts,
  public.appointment_charges
to authenticated;
