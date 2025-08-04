import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check premium subscription
    const { data: subscriber } = await supabaseService
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', userData.user.id)
      .single();

    if (!subscriber?.subscribed) {
      return new Response(JSON.stringify({ 
        error: 'Premium subscription required for AI Mental Health Coach',
        requiresUpgrade: true 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message, mood, stressLevel, userProfile } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's recent mental health related assessments
    const { data: recentAssessments } = await supabaseService
      .from('assessments')
      .select('symptom_description, triage_level, conditions, next_steps, created_at')
      .eq('user_id', userData.user.id)
      .ilike('symptom_description', '%anxiety%,%stress%,%depression%,%panic%,%worry%')
      .order('created_at', { ascending: false })
      .limit(3);

    // Get user's mood/stress tracking data
    const { data: mentalHealthFactors } = await supabaseService
      .from('tracked_factors')
      .select('factor_name, factor_value, notes, logged_at')
      .eq('user_id', userData.user.id)
      .in('factor_name', ['mood', 'stress_level', 'anxiety_level', 'sleep_quality', 'energy_level'])
      .order('logged_at', { ascending: false })
      .limit(15);

    // Build context for mental health AI
    let contextInfo = '';
    if (mood || stressLevel) {
      contextInfo += `\nCurrent State: Mood: ${mood || 'Not specified'}, Stress Level: ${stressLevel || 'Not specified'}\n`;
    }

    if (recentAssessments && recentAssessments.length > 0) {
      contextInfo += '\nRecent Mental Health Assessments:\n';
      recentAssessments.forEach((assessment, index) => {
        contextInfo += `${index + 1}. ${assessment.symptom_description} - ${new Date(assessment.created_at).toLocaleDateString()}\n`;
      });
    }

    if (mentalHealthFactors && mentalHealthFactors.length > 0) {
      contextInfo += '\nRecent Mental Health Tracking:\n';
      mentalHealthFactors.forEach((factor, index) => {
        contextInfo += `${index + 1}. ${factor.factor_name}: ${factor.factor_value} - ${new Date(factor.logged_at).toLocaleDateString()}\n`;
      });
    }

    // AI Mental Health Coach system prompt
    const systemPrompt = `You are a compassionate AI Mental Health Coach with expertise in cognitive behavioral therapy, mindfulness, stress management, and emotional wellness. You provide supportive guidance for mental health and emotional well-being.

Your role:
- Provide emotional support and practical coping strategies
- Offer evidence-based techniques for managing stress, anxiety, and mood
- Suggest mindfulness and relaxation exercises
- Help users develop healthy thought patterns and behaviors
- Recognize when professional mental health care is needed

Guidelines:
- ALWAYS emphasize that you are a supportive tool, not a replacement for professional mental health treatment
- Be empathetic, non-judgmental, and encouraging
- Focus on practical, actionable strategies
- Use validated techniques from CBT, mindfulness, and positive psychology
- Recognize crisis situations and recommend immediate professional help
- Maintain appropriate boundaries while being warm and supportive
- If someone expresses suicidal thoughts or self-harm, immediately recommend contacting emergency services or crisis hotlines

CRISIS RESPONSE: If the user expresses thoughts of self-harm or suicide, immediately respond with empathy and direct them to:
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741
- Emergency Services: 911
- Encourage them to reach out to a trusted friend, family member, or mental health professional immediately

User Context: ${userProfile ? JSON.stringify(userProfile) : 'No profile provided'}
${contextInfo}

Respond with warmth, empathy, and practical guidance. Focus on immediate support while encouraging long-term mental health practices.`;

    console.log('Calling OpenAI for mental health coaching...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Latest flagship model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Log the conversation for premium users
    await supabaseService
      .from('ai_coach_conversations')
      .insert({
        user_id: userData.user.id,
        coach_type: 'mental_health',
        user_message: message,
        ai_response: aiResponse,
        context_data: {
          mood,
          stressLevel,
          userProfile,
          recentAssessments: recentAssessments?.length || 0,
          mentalHealthFactors: mentalHealthFactors?.length || 0
        }
      })
      .select()
      .single();

    return new Response(JSON.stringify({ 
      response: aiResponse,
      coach_type: 'mental_health',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in mental-health-coach function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});