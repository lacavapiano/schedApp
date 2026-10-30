ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS business_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_due_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_invoice_due_days_check;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_invoice_due_days_check
  CHECK (invoice_due_days BETWEEN 0 AND 365);
