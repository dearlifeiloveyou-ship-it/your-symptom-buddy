-- Fix the reset_monthly_assessments function 
CREATE OR REPLACE FUNCTION public.reset_monthly_assessments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_assessments_used = 0,
    assessment_limit_reset_date = date_trunc('month', now()) + interval '1 month'
  WHERE assessment_limit_reset_date <= now();
END;
$$;