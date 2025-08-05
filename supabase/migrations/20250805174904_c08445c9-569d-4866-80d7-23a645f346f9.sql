-- Create voice interactions table for storing voice session data
CREATE TABLE IF NOT EXISTS public.voice_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('symptom_input', 'ai_coach', 'health_assessment')),
  audio_duration INTEGER, -- duration in seconds
  transcript TEXT,
  response_audio_url TEXT,
  response_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.voice_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice interactions"
  ON public.voice_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice interactions"
  ON public.voice_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice interactions"
  ON public.voice_interactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_voice_interactions_user_session 
  ON public.voice_interactions(user_id, session_type, created_at DESC);

-- Update the updated_at trigger
CREATE TRIGGER update_voice_interactions_updated_at
  BEFORE UPDATE ON public.voice_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();