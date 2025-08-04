import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('MEDICAL_API_KEY');

interface AnalysisRequest {
  symptoms: string;
  interviewResponses: Record<string, any>;
  profileData?: {
    age?: string;
    sex?: string;
    profileType: string;
  };
}

interface Condition {
  name: string;
  likelihood: number;
  recommendation: string;
  naturalRemedies: string;
}

interface TriageResult {
  triageLevel: 'low' | 'medium' | 'high';
  conditions: Condition[];
  actions: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      // Set the auth token for this request
      supabase.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: ''
      });
    }

    const { symptoms, interviewResponses, profileData }: AnalysisRequest = await req.json();

    console.log('Analyzing symptoms:', { symptoms, interviewResponses, profileData });

    // Mock medical analysis (replace with actual API call)
    const analysisResult = await performMedicalAnalysis(symptoms, interviewResponses, profileData);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-symptoms function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to analyze symptoms',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performMedicalAnalysis(
  symptoms: string, 
  responses: Record<string, any>, 
  profile?: any
): Promise<TriageResult> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Create the system prompt
  const systemPrompt = `You are an AI-powered symptom triage assistant. Your role is to analyze symptoms and provide medical guidance for triage purposes only. You are not providing a diagnosis, but helping users understand urgency levels and next steps.

IMPORTANT DISCLAIMERS:
- You are not a replacement for professional medical advice
- In case of emergency, always advise calling emergency services
- Encourage users to consult healthcare providers for proper diagnosis
- Natural remedies are complementary and should not replace professional medical care

Please analyze the provided symptoms and interview responses, then respond with a JSON object containing:
- triageLevel: "low", "medium", or "high" urgency
- conditions: array of possible conditions with name, likelihood (0-100%), brief recommendation, and naturalRemedies (home/natural remedies that may provide comfort)
- actions: summary of recommended next steps

For natural remedies, suggest safe, evidence-based home treatments like rest, hydration, heat/cold therapy, herbal teas, or gentle exercises. Always emphasize these are complementary to medical care.

Be conservative in your assessment and prioritize user safety.`;

  // Format the user prompt
  const userPrompt = `Patient Information:
${profile ? `Age: ${profile.age || 'Not specified'}, Sex: ${profile.sex || 'Not specified'}` : 'No demographic information provided'}

Symptoms: ${symptoms}

Interview Responses: ${JSON.stringify(responses, null, 2)}

Please provide your analysis as a JSON object.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);

    // Parse the JSON response
    const analysisResult = JSON.parse(content);
    
    return {
      triageLevel: analysisResult.triageLevel,
      conditions: analysisResult.conditions,
      actions: analysisResult.actions
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback response
    return {
      triageLevel: 'medium',
      conditions: [
        {
          name: 'Unable to analyze',
          likelihood: 50,
          recommendation: 'Please consult with a healthcare provider for proper evaluation',
          naturalRemedies: 'Rest, stay hydrated, and monitor symptoms closely'
        }
      ],
      actions: 'We recommend consulting with a healthcare provider for a proper evaluation of your symptoms.'
    };
  }
}