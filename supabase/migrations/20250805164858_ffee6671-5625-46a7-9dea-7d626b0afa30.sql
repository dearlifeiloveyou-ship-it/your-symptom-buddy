-- Fix security warnings by setting proper search_path for functions

-- Update calculate_bmi function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_bmi(height_cm INTEGER, weight_kg DECIMAL)
RETURNS DECIMAL(4,1)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 OR weight_kg <= 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)))::DECIMAL, 1);
END;
$$;

-- Update update_bmi function with secure search_path
CREATE OR REPLACE FUNCTION public.update_bmi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.bmi = public.calculate_bmi(NEW.height_cm, NEW.weight_kg);
  RETURN NEW;
END;
$$;

-- Also fix the existing handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  
  -- Create subscriber record for new user
  INSERT INTO public.subscribers (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$;