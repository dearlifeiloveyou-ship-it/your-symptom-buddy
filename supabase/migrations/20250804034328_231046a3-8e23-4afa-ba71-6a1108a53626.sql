-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  relationship TEXT CHECK (relationship IN ('myself', 'child', 'other')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessments table for symptom checks
CREATE TABLE public.assessments (
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
CREATE TABLE public.tracked_symptoms (
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
CREATE TABLE public.tracked_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  factor_value TEXT NOT NULL,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_factors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();