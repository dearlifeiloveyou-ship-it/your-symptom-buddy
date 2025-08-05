-- Fix function search path for security definer functions
CREATE OR REPLACE FUNCTION public.start_trial(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix other security definer functions search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_user_streak(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_assessments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_assessments_used = 0,
    assessment_limit_reset_date = date_trunc('month', now()) + interval '1 month'
  WHERE assessment_limit_reset_date <= now();
END;
$$;