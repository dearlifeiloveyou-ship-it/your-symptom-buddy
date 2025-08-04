-- Update existing profiles table to add health-related columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female', 'other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS relationship TEXT CHECK (relationship IN ('myself', 'child', 'other')) DEFAULT 'myself';

-- Create assessments table for symptom checks
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symptom_description TEXT NOT NULL,
  interview_responses JSONB DEFAULT '{}',
  api_results JSONB DEFAULT '{}',
  triage_level TEXT CHECK (triage_level IN ('emergency', 'urgent', 'routine', 'self_care')),
  conditions JSONB DEFAULT '[]',
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tracked_symptoms table for daily logging
CREATE TABLE IF NOT EXISTS public.tracked_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tracked_factors table for contextual factors
CREATE TABLE IF NOT EXISTS public.tracked_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  factor_value TEXT NOT NULL,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on new tables
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_factors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assessments
CREATE POLICY "Users can view their own assessments" ON public.assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments" ON public.assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" ON public.assessments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessments" ON public.assessments
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tracked_symptoms
CREATE POLICY "Users can view their own tracked symptoms" ON public.tracked_symptoms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracked symptoms" ON public.tracked_symptoms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked symptoms" ON public.tracked_symptoms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked symptoms" ON public.tracked_symptoms
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tracked_factors
CREATE POLICY "Users can view their own tracked factors" ON public.tracked_factors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracked factors" ON public.tracked_factors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked factors" ON public.tracked_factors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked factors" ON public.tracked_factors
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();