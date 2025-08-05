import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { timeRange, analysisType } = await req.json();

    console.log('Generating insights for user:', user.id, 'timeRange:', timeRange, 'type:', analysisType);

    // Get user's health data for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (timeRange || 30));

    // Fetch symptoms data
    const { data: symptoms } = await supabase
      .from('tracked_symptoms')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at');

    // Fetch factors data
    const { data: factors } = await supabase
      .from('tracked_factors')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at');

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare data for AI analysis
    const contextData = {
      user_profile: profile,
      symptoms: symptoms || [],
      factors: factors || [],
      time_range: timeRange,
      analysis_type: analysisType
    };

    // Generate AI insights using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an AI health analytics specialist. Analyze the provided health data and generate actionable insights. 

Focus on:
1. Pattern recognition in symptoms and factors
2. Predictive insights about potential health trends
3. Personalized recommendations based on the data
4. Risk assessment and early warning signs

Respond with a JSON object containing:
{
  "insights": [
    {
      "type": "warning|recommendation|trend",
      "title": "Brief title",
      "description": "Detailed description",
      "confidence": 0-100,
      "priority": 1-5,
      "actionable_steps": ["step1", "step2"],
      "created_at": "ISO date"
    }
  ],
  "patterns": [
    {
      "pattern_type": "daily|weekly|monthly",
      "description": "Pattern description",
      "confidence": 0-100
    }
  ],
  "recommendations": [
    {
      "category": "lifestyle|nutrition|exercise|sleep",
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "impact_score": 0-10,
      "effort_level": "low|medium|high",
      "timeline": "expected timeline"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Analyze this health data and provide insights:

User Profile: ${JSON.stringify(profile, null, 2)}

Symptoms (last ${timeRange} days):
${JSON.stringify(symptoms, null, 2)}

Tracked Factors (last ${timeRange} days):
${JSON.stringify(factors, null, 2)}

Please provide comprehensive analysis focusing on patterns, trends, and actionable recommendations.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const aiResponse = await response.json();
    const analysisResult = JSON.parse(aiResponse.choices[0].message.content);

    // Store insights in database for future reference
    if (analysisResult.insights && analysisResult.insights.length > 0) {
      const insightsToStore = analysisResult.insights.map((insight: any) => ({
        user_id: user.id,
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        priority: insight.priority || 1,
        is_active: true
      }));

      await supabase
        .from('health_insights')
        .insert(insightsToStore);
    }

    console.log('Generated insights successfully:', analysisResult.insights?.length || 0, 'insights');

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        // Fallback insights for demo
        insights: [
          {
            type: 'recommendation',
            title: 'Data Analysis In Progress',
            description: 'Continue tracking your symptoms and factors to generate more personalized insights.',
            confidence: 100,
            priority: 1,
            actionable_steps: [
              'Track symptoms daily for better analysis',
              'Log mood, energy, and stress levels',
              'Maintain consistent tracking habits'
            ],
            created_at: new Date().toISOString()
          }
        ]
      }),
      {
        status: 200, // Return 200 with fallback data instead of error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});