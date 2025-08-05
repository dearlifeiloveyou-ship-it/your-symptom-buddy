-- Add personal health information to profiles table
ALTER TABLE public.profiles 
ADD COLUMN height_cm INTEGER,
ADD COLUMN weight_kg DECIMAL(5,2),
ADD COLUMN bmi DECIMAL(4,1),
ADD COLUMN medical_conditions TEXT[],
ADD COLUMN allergies TEXT[],
ADD COLUMN medications TEXT[],
ADD COLUMN emergency_contact TEXT,
ADD COLUMN preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
ADD COLUMN health_goals TEXT[],
ADD COLUMN activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN health_questionnaire_completed BOOLEAN DEFAULT false;

-- Create a function to calculate BMI
CREATE OR REPLACE FUNCTION public.calculate_bmi(height_cm INTEGER, weight_kg DECIMAL)
RETURNS DECIMAL(4,1)
LANGUAGE plpgsql
AS $$
BEGIN
  IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 OR weight_kg <= 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)))::DECIMAL, 1);
END;
$$;

-- Create trigger to automatically update BMI when height or weight changes
CREATE OR REPLACE FUNCTION public.update_bmi()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.bmi = public.calculate_bmi(NEW.height_cm, NEW.weight_kg);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profile_bmi
  BEFORE INSERT OR UPDATE OF height_cm, weight_kg ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bmi();

-- Create health insights table for storing personalized recommendations
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('bmi', 'risk_factor', 'recommendation', 'goal')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on health_insights table
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for health_insights
CREATE POLICY "Users can view their own health insights" 
ON public.health_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health insights" 
ON public.health_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health insights" 
ON public.health_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health insights" 
ON public.health_insights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for health_insights updated_at
CREATE TRIGGER update_health_insights_updated_at
  BEFORE UPDATE ON public.health_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();