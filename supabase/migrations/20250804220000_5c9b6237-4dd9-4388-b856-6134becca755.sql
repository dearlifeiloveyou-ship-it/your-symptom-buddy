-- Create subscribers table for subscription management
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  monthly_assessments_used INTEGER NOT NULL DEFAULT 0,
  monthly_assessments_limit INTEGER NOT NULL DEFAULT 3,
  assessment_limit_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers table
CREATE POLICY "Users can view their own subscription"
ON public.subscribers
FOR SELECT
USING (auth.uid() = user_id OR email = auth.email());

CREATE POLICY "Users can update their own subscription"
ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id OR email = auth.email());

CREATE POLICY "Users can insert their own subscription"
ON public.subscribers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to reset monthly assessment usage
CREATE OR REPLACE FUNCTION public.reset_monthly_assessments()
RETURNS void AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_assessments_used = 0,
    assessment_limit_reset_date = date_trunc('month', now()) + interval '1 month'
  WHERE assessment_limit_reset_date <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user trigger to create subscriber record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;