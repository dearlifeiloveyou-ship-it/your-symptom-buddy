import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

interface SymptomPattern {
  keywords: string[];
  conditions: string[];
  triageLevel: 'low' | 'medium' | 'high';
  likelihood: number;
  recommendation: string;
  naturalRemedies: string;
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

    // Perform rule-based medical analysis
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
  
  console.log("Analyzing symptoms text:", symptoms);
  console.log("Interview responses:", responses);
  
  // Use the built-in comprehensive symptom database
  const matchedPatterns = searchSymptoms(symptoms);
  console.log(`Total matched patterns: ${matchedPatterns.length}`);
  
  if (matchedPatterns.length === 0) {
    // If no specific patterns match, provide general guidance
    return {
      triageLevel: 'low',
      conditions: [{
        name: 'General symptoms',
        likelihood: 30,
        recommendation: 'Consider consulting with a healthcare provider for proper evaluation of your symptoms. Monitor your condition and seek care if symptoms worsen or persist.',
        naturalRemedies: 'Rest, adequate hydration, balanced nutrition, and stress management may help with general wellness.'
      }],
      actions: 'Schedule a routine consultation with your healthcare provider.'
    };
  }

  // Factor in interview responses
  let painLevel = responses.pain_level || 0;
  let hasFever = responses.fever || false;
  let duration = responses.duration || '';

  // Determine final triage level
  let finalTriageLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (matchedPatterns.length > 0) {
    const highestTriage = matchedPatterns.reduce((highest, pattern) => {
      if (pattern.triageLevel === 'high') return 'high';
      if (pattern.triageLevel === 'medium' && highest !== 'high') return 'medium';
      return highest;
    }, 'low' as 'low' | 'medium' | 'high');
    
    finalTriageLevel = highestTriage;
  }

  // Escalate based on pain level
  if (painLevel >= 8) {
    finalTriageLevel = 'high';
  } else if (painLevel >= 6) {
    finalTriageLevel = finalTriageLevel === 'low' ? 'medium' : finalTriageLevel;
  }

  // Escalate based on fever
  if (hasFever && finalTriageLevel === 'low') {
    finalTriageLevel = 'medium';
  }

  // Build conditions array from matched patterns
  const conditions: Condition[] = matchedPatterns.map(pattern => ({
    name: pattern.conditions[0],
    likelihood: pattern.likelihood,
    recommendation: pattern.recommendation,
    naturalRemedies: pattern.naturalRemedies
  }));

  // Determine actions based on triage level
  let actions: string;
  switch (finalTriageLevel) {
    case 'high':
      actions = 'Seek emergency medical attention immediately. Do not delay care for potentially serious symptoms.';
      break;
    case 'medium':
      actions = 'Schedule an appointment with your healthcare provider within 24-48 hours. Monitor symptoms closely.';
      break;
    case 'low':
      actions = 'Practice self-care and monitor symptoms. Contact healthcare provider if symptoms worsen or persist beyond expected timeframe.';
      break;
  }

  return {
    triageLevel: finalTriageLevel,
    conditions,
    actions
  };
}

// Comprehensive symptom database functions
function searchSymptoms(symptomText: string): SymptomPattern[] {
  const normalizedText = symptomText.toLowerCase();
  const matchedPatterns: Array<SymptomPattern & { matchScore: number }> = [];

  COMPREHENSIVE_SYMPTOM_DATABASE.forEach(pattern => {
    let matchScore = 0;
    let keywordMatches = 0;

    pattern.keywords.forEach(keyword => {
      if (normalizedText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        if (normalizedText === keyword.toLowerCase()) {
          matchScore += 10;
        } else {
          matchScore += 5;
        }
      }
    });

    if (keywordMatches > 0) {
      matchedPatterns.push({ ...pattern, matchScore });
    }
  });

  return matchedPatterns
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)
    .map(({ matchScore, ...pattern }) => pattern);
}

// Comprehensive symptom database based on ICD-10 classifications
const COMPREHENSIVE_SYMPTOM_DATABASE: SymptomPattern[] = [
  // CARDIOVASCULAR & CIRCULATORY SYMPTOMS (R00-R09)
  {
    keywords: ['chest pain', 'heart attack', 'cardiac', 'crushing pain', 'pressure chest', 'angina'],
    conditions: ['Myocardial infarction', 'Angina pectoris', 'Acute coronary syndrome'],
    triageLevel: 'high',
    likelihood: 90,
    recommendation: 'Call emergency services immediately. Do not drive yourself to hospital.',
    naturalRemedies: 'Do not attempt self-treatment. This requires immediate emergency care.'
  },
  {
    keywords: ['palpitations', 'heart racing', 'irregular heartbeat', 'heart skipping', 'rapid pulse'],
    conditions: ['Arrhythmia', 'Atrial fibrillation', 'Tachycardia'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Monitor symptoms and seek medical evaluation within 24 hours if persistent.',
    naturalRemedies: 'Deep breathing exercises, avoid caffeine, rest in calm environment.'
  },
  {
    keywords: ['shortness of breath', 'difficulty breathing', 'cannot breathe', 'gasping', 'dyspnea'],
    conditions: ['Asthma exacerbation', 'Pulmonary embolism', 'Heart failure', 'Pneumonia'],
    triageLevel: 'high',
    likelihood: 85,
    recommendation: 'Seek immediate emergency care for severe breathing difficulties.',
    naturalRemedies: 'Sit upright, remain calm, use prescribed inhaler if available.'
  },
  {
    keywords: ['severe abdominal pain', 'appendicitis', 'intense stomach pain', 'sharp belly pain'],
    conditions: ['Appendicitis', 'Bowel obstruction', 'Perforated ulcer', 'Gallstones'],
    triageLevel: 'high',
    likelihood: 80,
    recommendation: 'Seek emergency medical evaluation for severe abdominal pain.',
    naturalRemedies: 'Avoid food and water until evaluated by medical professional.'
  },
  {
    keywords: ['fever', 'high temperature', 'hot', 'burning up', 'pyrexia'],
    conditions: ['Viral infection', 'Bacterial infection', 'Inflammatory condition'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Monitor temperature, seek care if fever >102°F or persistent >3 days.',
    naturalRemedies: 'Rest, fluids, cool compresses, elderberry, honey and lemon.'
  },
  {
    keywords: ['headache', 'head pain', 'migraine', 'severe headache'],
    conditions: ['Migraine', 'Tension headache', 'Cluster headache'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'Monitor symptoms, seek immediate care for sudden severe headache.',
    naturalRemedies: 'Dark quiet room, cold compress, hydration, rest.'
  },
  {
    keywords: ['dizziness', 'vertigo', 'lightheaded', 'spinning sensation', 'balance problems'],
    conditions: ['Vertigo', 'Inner ear infection', 'Low blood pressure', 'Dehydration'],
    triageLevel: 'low',
    likelihood: 60,
    recommendation: 'Avoid sudden movements, stay hydrated, seek care if persistent.',
    naturalRemedies: 'Sit or lie down, ginger tea, avoid sudden movements, hydration.'
  },
  {
    keywords: ['nausea', 'vomiting', 'throwing up', 'feeling sick', 'queasy'],
    conditions: ['Gastroenteritis', 'Food poisoning', 'Migraine', 'Pregnancy'],
    triageLevel: 'low',
    likelihood: 60,
    recommendation: 'Rest, clear fluids, seek care if persistent vomiting or dehydration signs.',
    naturalRemedies: 'Ginger tea, small sips of water, BRAT diet, rest.'
  },
  {
    keywords: ['cough', 'cold', 'congestion', 'runny nose', 'stuffy nose', 'sneezing'],
    conditions: ['Common cold', 'Upper respiratory infection', 'Viral infection'],
    triageLevel: 'low',
    likelihood: 85,
    recommendation: 'Rest and supportive care. See healthcare provider if symptoms worsen or persist beyond 10 days.',
    naturalRemedies: 'Rest, honey and lemon tea, steam inhalation, warm salt water gargle, increased fluids.'
  },
  {
    keywords: ['fatigue', 'tired', 'exhausted', 'low energy', 'weakness'],
    conditions: ['Viral infection', 'Stress', 'Sleep deprivation', 'Nutritional deficiency'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Ensure adequate rest and nutrition. See healthcare provider if fatigue persists.',
    naturalRemedies: 'Adequate sleep, balanced nutrition, light exercise, stress management.'
  },
  {
    keywords: ['joint pain', 'arthritis', 'stiff joints', 'swollen joints', 'knee pain'],
    conditions: ['Arthritis', 'Joint inflammation', 'Gout', 'Injury'],
    triageLevel: 'low',
    likelihood: 55,
    recommendation: 'Rest affected joint, seek care if severe pain or loss of function.',
    naturalRemedies: 'Ice for acute injury, heat for chronic pain, gentle movement, turmeric.'
  },
  {
    keywords: ['back pain', 'lower back pain', 'spine pain', 'sciatica'],
    conditions: ['Muscle strain', 'Herniated disc', 'Sciatica', 'Spinal stenosis'],
    triageLevel: 'low',
    likelihood: 60,
    recommendation: 'Rest, gentle movement, seek care if severe or radiating pain.',
    naturalRemedies: 'Heat therapy, gentle stretching, anti-inflammatory foods, proper posture.'
  },
  {
    keywords: ['rash', 'skin rash', 'hives', 'itchy skin', 'red bumps'],
    conditions: ['Allergic reaction', 'Eczema', 'Contact dermatitis', 'Viral rash'],
    triageLevel: 'low',
    likelihood: 60,
    recommendation: 'Avoid known irritants, seek care if spreading or accompanied by breathing issues.',
    naturalRemedies: 'Cool compresses, oatmeal baths, avoid scratching, gentle moisturizers.'
  },
  {
    keywords: ['anxiety', 'panic attack', 'worried', 'stressed', 'nervous'],
    conditions: ['Anxiety disorder', 'Panic disorder', 'Stress reaction'],
    triageLevel: 'low',
    likelihood: 65,
    recommendation: 'Practice relaxation techniques, seek professional help if persistent.',
    naturalRemedies: 'Deep breathing, meditation, chamomile tea, regular exercise.'
  },
  // Additional comprehensive symptoms
  {
    keywords: ['bleeding', 'blood', 'hemorrhage'],
    conditions: ['Hemorrhage', 'Trauma', 'Bleeding disorder'],
    triageLevel: 'high',
    likelihood: 85,
    recommendation: 'Apply direct pressure and seek emergency care immediately.',
    naturalRemedies: 'Apply firm pressure to bleeding site and elevate if possible.'
  },
  {
    keywords: ['confusion', 'disoriented', 'memory loss', 'cognitive'],
    conditions: ['Delirium', 'Dementia', 'Metabolic disorder'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'Seek medical evaluation for cognitive changes.',
    naturalRemedies: 'Ensure safety, maintain routine, seek professional evaluation.'
  },
  {
    keywords: ['seizure', 'convulsions', 'fits'],
    conditions: ['Epilepsy', 'Febrile seizure', 'Brain injury'],
    triageLevel: 'high',
    likelihood: 95,
    recommendation: 'Call emergency services immediately.',
    naturalRemedies: 'Ensure safety, turn person on side, do not restrain.'
  },
  {
    keywords: ['urinary', 'urine', 'bladder', 'kidney'],
    conditions: ['UTI', 'Kidney stones', 'Bladder infection'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Increase fluid intake and see healthcare provider.',
    naturalRemedies: 'Cranberry juice, increased water, avoid irritants.'
  }
];