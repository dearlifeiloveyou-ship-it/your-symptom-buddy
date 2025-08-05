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

    const { photoUrl, description } = await req.json();

    if (!photoUrl) {
      return new Response(JSON.stringify({ error: 'Photo URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analyzing photo for user:', userData.user.id);

    // AI analysis of the photo
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a medical AI assistant analyzing health-related photos. Provide structured analysis focused on visible health concerns.

IMPORTANT: You are NOT providing a diagnosis, only observations and guidance. Always recommend professional medical evaluation.

Respond in JSON format:
{
  "analysis": "Description of what you observe",
  "possibleConditions": [
    {
      "name": "Condition name",
      "likelihood": 0.75,
      "description": "Brief description",
      "recommendation": "What to do next"
    }
  ],
  "urgencyLevel": "low|medium|high",
  "recommendations": "General recommendations",
  "confidenceScore": 0.8,
  "limitations": "What this analysis cannot determine"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this health-related photo. ${description ? `User description: ${description}` : ''}`
              },
              {
                type: 'image_url',
                image_url: { url: photoUrl }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        analysis: analysisText,
        possibleConditions: [],
        urgencyLevel: 'medium',
        recommendations: 'Please consult with a healthcare professional for proper evaluation.',
        confidenceScore: 0.5,
        limitations: 'Unable to provide structured analysis. Please seek professional medical advice.'
      };
    }

    // Store the photo assessment
    const { data: assessment, error: insertError } = await supabaseService
      .from('photo_assessments')
      .insert({
        user_id: userData.user.id,
        photo_url: photoUrl,
        description: description || null,
        ai_analysis: analysisResult,
        conditions_detected: analysisResult.possibleConditions || [],
        confidence_score: analysisResult.confidenceScore || 0.5
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing photo assessment:', insertError);
      throw new Error('Failed to store assessment');
    }

    return new Response(JSON.stringify({
      assessmentId: assessment.id,
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in photo-assessment function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while analyzing the photo. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});