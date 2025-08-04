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
        error: 'Premium subscription required for AI Health Coach',
        requiresUpgrade: true 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message, userProfile, healthHistory } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's recent assessments for context
    const { data: recentAssessments } = await supabaseService
      .from('assessments')
      .select('symptom_description, triage_level, conditions, next_steps, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Get user's tracked symptoms for context
    const { data: trackedSymptoms } = await supabaseService
      .from('tracked_symptoms')
      .select('symptom_name, severity, notes, logged_at')
      .eq('user_id', userData.user.id)
      .order('logged_at', { ascending: false })
      .limit(10);

    // Build context for the AI
    let contextInfo = '';
    if (recentAssessments && recentAssessments.length > 0) {
      contextInfo += '\n\nRecent Health Assessments:\n';
      recentAssessments.forEach((assessment, index) => {
        contextInfo += `${index + 1}. ${assessment.symptom_description} (${assessment.triage_level} priority) - ${new Date(assessment.created_at).toLocaleDateString()}\n`;
      });
    }

    if (trackedSymptoms && trackedSymptoms.length > 0) {
      contextInfo += '\n\nRecent Tracked Symptoms:\n';
      trackedSymptoms.forEach((symptom, index) => {
        contextInfo += `${index + 1}. ${symptom.symptom_name} (Severity: ${symptom.severity}/10) - ${new Date(symptom.logged_at).toLocaleDateString()}\n`;
      });
    }

    // AI Health Coach system prompt
    const systemPrompt = `You are an experienced AI Health Coach with expertise in preventive medicine, lifestyle optimization, and wellness guidance. You provide personalized health advice based on evidence-based practices.

Your role:
- Provide personalized health and wellness guidance
- Suggest lifestyle improvements and preventive measures
- Help interpret health trends and patterns
- Offer motivation and support for health goals
- Recommend when to seek professional medical care

Guidelines:
- Always emphasize that you complement, not replace, professional medical care
- Focus on prevention, lifestyle, and wellness optimization
- Provide actionable, evidence-based recommendations
- Be supportive and encouraging while being realistic
- Suggest seeking medical attention for concerning symptoms
- Consider the user's health history and current status

User Context: ${userProfile ? JSON.stringify(userProfile) : 'No profile provided'}
${contextInfo}

Respond in a warm, professional, and encouraging tone. Provide specific, actionable advice when possible.`;

    console.log('Calling OpenAI for health coaching...');

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
        coach_type: 'health',
        user_message: message,
        ai_response: aiResponse,
        context_data: {
          userProfile,
          healthHistory,
          recentAssessments: recentAssessments?.length || 0,
          trackedSymptoms: trackedSymptoms?.length || 0
        }
      })
      .select()
      .single();

    return new Response(JSON.stringify({ 
      response: aiResponse,
      coach_type: 'health',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in health-coach function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});