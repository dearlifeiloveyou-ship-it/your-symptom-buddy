-- Add trial tracking to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN trial_started_at timestamp with time zone,
ADD COLUMN trial_ends_at timestamp with time zone,
ADD COLUMN is_in_trial boolean DEFAULT false;

-- Create photo assessments table
CREATE TABLE public.photo_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  description text,
  ai_analysis jsonb,
  conditions_detected jsonb DEFAULT '[]'::jsonb,
  confidence_score numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for photo assessments
ALTER TABLE public.photo_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for photo assessments
CREATE POLICY "Users can create their own photo assessments" 
ON public.photo_assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own photo assessments" 
ON public.photo_assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own photo assessments" 
ON public.photo_assessments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photo assessments" 
ON public.photo_assessments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for photo assessments updated_at
CREATE TRIGGER update_photo_assessments_updated_at
BEFORE UPDATE ON public.photo_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update subscription handling to include trial logic
CREATE OR REPLACE FUNCTION public.start_trial(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    trial_started_at = now(),
    trial_ends_at = now() + interval '7 days',
    is_in_trial = true,
    subscribed = true,
    subscription_tier = 'trial'
  WHERE user_id = user_id_param AND trial_started_at IS NULL;
END;
$$;