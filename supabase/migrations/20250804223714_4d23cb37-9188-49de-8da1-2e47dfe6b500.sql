-- Create subscribers table for user subscription management
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  stripe_customer_id TEXT,
  monthly_assessments_limit INTEGER NOT NULL DEFAULT 3,
  monthly_assessments_used INTEGER NOT NULL DEFAULT 0,
  assessment_limit_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessments table for storing health assessments
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID,
  symptom_description TEXT NOT NULL,
  interview_responses JSONB DEFAULT '{}'::jsonb,
  api_results JSONB,
  conditions JSONB DEFAULT '[]'::jsonb,
  triage_level TEXT,
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers FOR SELECT USING ((auth.uid() = user_id) OR (email = auth.email()));
CREATE POLICY "Users can insert their own subscription" ON public.subscribers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscribers FOR UPDATE USING ((auth.uid() = user_id) OR (email = auth.email()));

-- Create RLS policies for assessments
CREATE POLICY "Users can view their own assessments" ON public.assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assessments" ON public.assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assessments" ON public.assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assessments" ON public.assessments FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for automatic subscriber creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';

-- Add update triggers
CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();