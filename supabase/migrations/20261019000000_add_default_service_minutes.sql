-- Store optional standard duration for flat-rate services, in minutes.
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS default_service_minutes integer;

ALTER TABLE public.service_types
  DROP CONSTRAINT IF EXISTS service_types_default_service_minutes_check;

ALTER TABLE public.service_types
  ADD CONSTRAINT service_types_default_service_minutes_check
  CHECK (
    default_service_minutes IS NULL
    OR (default_service_minutes >= 1 AND default_service_minutes <= 1440)
  );
