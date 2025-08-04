-- Create table for AI coach conversations
CREATE TABLE public.ai_coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_type TEXT NOT NULL CHECK (coach_type IN ('health', 'mental_health')),
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_coach_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_coach_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.ai_coach_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.ai_coach_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.ai_coach_conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.ai_coach_conversations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_ai_coach_conversations_user_type_created 
ON public.ai_coach_conversations(user_id, coach_type, created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_coach_conversations_updated_at
BEFORE UPDATE ON public.ai_coach_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();