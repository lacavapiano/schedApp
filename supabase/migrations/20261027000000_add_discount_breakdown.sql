-- Required by pricingController.saveAppointmentCharges().
-- Stores the per-charge snapshot of applied discount rules and amounts.
ALTER TABLE public.appointment_charges
  ADD COLUMN IF NOT EXISTS discount_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Make the new column visible to PostgREST/Supabase API requests immediately.
NOTIFY pgrst, 'reload schema';
