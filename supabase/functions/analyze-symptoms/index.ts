import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const medicalApiKey = Deno.env.get('MEDICAL_API_KEY');

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
  confidence: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface TriageResult {
  level: 'emergency' | 'urgent' | 'routine' | 'self-care';
  message: string;
  nextSteps: string[];
  conditions: Condition[];
  severity_score: number;
  recommendations: string[];
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
      supabase.auth.setAuth(authHeader.replace('Bearer ', ''));
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
  // Mock implementation - replace with actual medical API call
  // For now, we'll use simple keyword analysis and scoring
  
  const lowerSymptoms = symptoms.toLowerCase();
  let severity_score = 1;
  let conditions: Condition[] = [];
  let level: TriageResult['level'] = 'self-care';
  let message = '';
  let nextSteps: string[] = [];
  let recommendations: string[] = [];

  // Emergency keywords
  const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'stroke', 'heart attack'];
  const urgentKeywords = ['high fever', 'severe pain', 'infection', 'persistent vomiting'];
  const routineKeywords = ['headache', 'fatigue', 'mild pain', 'cold symptoms'];

  // Analyze symptom severity
  if (emergencyKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
    level = 'emergency';
    severity_score = 9;
    message = 'Seek immediate emergency medical attention. Call 911 or go to the nearest emergency room.';
    nextSteps = [
      'Call 911 immediately',
      'Do not drive yourself to the hospital',
      'Stay calm and follow emergency operator instructions'
    ];
    recommendations = ['Emergency care required', 'Do not delay treatment'];
  } else if (urgentKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
    level = 'urgent';
    severity_score = 6;
    message = 'You should seek medical care within 24 hours. Consider urgent care or contacting your healthcare provider.';
    nextSteps = [
      'Contact your healthcare provider today',
      'Consider urgent care if provider unavailable',
      'Monitor symptoms for any worsening'
    ];
    recommendations = ['Urgent medical evaluation recommended', 'Monitor symptoms closely'];
  } else if (routineKeywords.some(keyword => lowerSymptoms.includes(keyword))) {
    level = 'routine';
    severity_score = 3;
    message = 'Your symptoms suggest a condition that should be evaluated within a few days.';
    nextSteps = [
      'Schedule an appointment with your healthcare provider',
      'Monitor symptoms and note any changes',
      'Consider over-the-counter remedies as appropriate'
    ];
    recommendations = ['Schedule routine medical consultation', 'Self-care measures may help'];
  } else {
    level = 'self-care';
    severity_score = 1;
    message = 'Your symptoms may be manageable with self-care measures.';
    nextSteps = [
      'Rest and stay hydrated',
      'Monitor symptoms for any worsening',
      'Contact healthcare provider if symptoms persist'
    ];
    recommendations = ['Self-care measures recommended', 'Monitor for changes'];
  }

  // Generate likely conditions based on symptoms
  if (lowerSymptoms.includes('headache')) {
    conditions.push({
      name: 'Tension Headache',
      confidence: 75,
      description: 'Most common type of headache, often related to stress or muscle tension',
      severity: severity_score > 5 ? 'high' : 'medium'
    });
    
    if (responses.fever === true || lowerSymptoms.includes('nausea')) {
      conditions.push({
        name: 'Migraine',
        confidence: 60,
        description: 'Severe headache often accompanied by nausea and light sensitivity',
        severity: 'medium'
      });
    }
  }

  if (lowerSymptoms.includes('fever') || responses.fever === true) {
    conditions.push({
      name: 'Viral Infection',
      confidence: 70,
      description: 'Common viral illness with fever and systemic symptoms',
      severity: severity_score > 6 ? 'high' : 'medium'
    });
  }

  if (lowerSymptoms.includes('pain')) {
    const painLevel = responses.pain_level || 5;
    conditions.push({
      name: 'Musculoskeletal Pain',
      confidence: 65,
      description: 'Pain related to muscles, joints, or bones',
      severity: painLevel > 7 ? 'high' : painLevel > 4 ? 'medium' : 'low'
    });
  }

  // Default condition if no specific match
  if (conditions.length === 0) {
    conditions.push({
      name: 'General Symptoms',
      confidence: 50,
      description: 'Non-specific symptoms requiring further evaluation',
      severity: 'low'
    });
  }

  // Sort conditions by confidence
  conditions.sort((a, b) => b.confidence - a.confidence);

  console.log('Analysis result:', { level, severity_score, conditions: conditions.length });

  return {
    level,
    message,
    nextSteps,
    conditions,
    severity_score,
    recommendations
  };
}