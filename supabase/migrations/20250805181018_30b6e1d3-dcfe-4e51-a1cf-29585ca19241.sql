-- Create user_stats table for gamification
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  badges_earned TEXT[] NOT NULL DEFAULT '{}',
  level INTEGER NOT NULL DEFAULT 1,
  assessments_completed INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stats
CREATE POLICY "Users can view their own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  current_stats RECORD;
  new_streak INTEGER;
BEGIN
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_stats 
  WHERE user_id = user_id_param;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate new streak
  IF current_stats.last_activity_date = CURRENT_DATE THEN
    -- Already updated today, no change
    RETURN;
  ELSIF current_stats.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    new_streak := current_stats.current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    new_streak := 1;
  END IF;
  
  -- Update stats
  UPDATE public.user_stats 
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;