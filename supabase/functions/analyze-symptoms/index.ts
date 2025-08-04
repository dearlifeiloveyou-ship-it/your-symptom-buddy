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
  
  // Define symptom patterns with triage levels and remedies
  const symptomPatterns: SymptomPattern[] = [
    // HIGH PRIORITY SYMPTOMS
    {
      keywords: ['chest pain', 'heart attack', 'cardiac', 'crushing', 'pressure chest'],
      conditions: ['Possible cardiac event', 'Angina'],
      triageLevel: 'high',
      likelihood: 85,
      recommendation: 'Seek emergency medical attention immediately. Do not drive yourself.',
      naturalRemedies: 'Do not attempt self-treatment. Call emergency services immediately.'
    },
    {
      keywords: ['shortness of breath', 'difficulty breathing', 'cannot breathe', 'gasping'],
      conditions: ['Respiratory distress', 'Asthma exacerbation', 'Pulmonary embolism'],
      triageLevel: 'high',
      likelihood: 80,
      recommendation: 'Seek immediate emergency care for breathing difficulties.',
      naturalRemedies: 'Sit upright, try to remain calm, and seek emergency care immediately.'
    },
    {
      keywords: ['severe bleeding', 'uncontrolled bleeding', 'hemorrhage', 'blood loss'],
      conditions: ['Hemorrhage', 'Trauma'],
      triageLevel: 'high',
      likelihood: 90,
      recommendation: 'Apply direct pressure and seek emergency care immediately.',
      naturalRemedies: 'Apply firm pressure to bleeding site and elevate if possible.'
    },
    {
      keywords: ['stiff neck', 'neck stiffness', 'meningitis'],
      conditions: ['Meningitis', 'Central nervous system infection'],
      triageLevel: 'high',
      likelihood: 75,
      recommendation: 'Seek emergency medical evaluation immediately.',
      naturalRemedies: 'Do not attempt self-treatment. Seek emergency care immediately.'
    },
    {
      keywords: ['severe abdominal pain', 'appendicitis', 'severe stomach pain'],
      conditions: ['Appendicitis', 'Bowel obstruction', 'Severe gastritis'],
      triageLevel: 'high',
      likelihood: 70,
      recommendation: 'Seek emergency medical evaluation for severe abdominal pain.',
      naturalRemedies: 'Avoid food and water until evaluated by medical professional.'
    },

    // MEDIUM PRIORITY SYMPTOMS
    {
      keywords: ['fever', 'high fever', 'temperature', 'hot'],
      conditions: ['Viral infection', 'Bacterial infection', 'Flu'],
      triageLevel: 'medium',
      likelihood: 70,
      recommendation: 'Monitor temperature and see healthcare provider if fever persists over 3 days or exceeds 102°F.',
      naturalRemedies: 'Rest, increased fluid intake, cool compresses, elderberry tea, honey and lemon.'
    },
    {
      keywords: ['persistent vomiting', 'cannot keep food down', 'severe nausea'],
      conditions: ['Gastroenteritis', 'Food poisoning', 'Viral gastritis'],
      triageLevel: 'medium',
      likelihood: 65,
      recommendation: 'Stay hydrated and see healthcare provider if vomiting persists more than 24 hours.',
      naturalRemedies: 'Clear fluids, ginger tea, BRAT diet (bananas, rice, applesauce, toast), rest.'
    },
    {
      keywords: ['moderate pain', 'persistent pain', 'aching'],
      conditions: ['Muscle strain', 'Inflammatory condition'],
      triageLevel: 'medium',
      likelihood: 60,
      recommendation: 'Monitor pain levels and see healthcare provider if pain worsens or persists.',
      naturalRemedies: 'Rest, ice/heat therapy, turmeric tea, gentle stretching, adequate sleep.'
    },
    {
      keywords: ['diarrhea', 'loose stools', 'stomach upset'],
      conditions: ['Gastroenteritis', 'Food intolerance', 'Viral infection'],
      triageLevel: 'medium',
      likelihood: 65,
      recommendation: 'Stay hydrated and see healthcare provider if symptoms persist more than 3 days.',
      naturalRemedies: 'BRAT diet, probiotics, chamomile tea, increased fluid intake, rest.'
    },

    // LOW PRIORITY SYMPTOMS
    {
      keywords: ['headache', 'head pain', 'migraine'],
      conditions: ['Tension headache', 'Migraine', 'Stress headache'],
      triageLevel: 'low',
      likelihood: 80,
      recommendation: 'Rest in a dark, quiet room. See healthcare provider if headaches are frequent or severe.',
      naturalRemedies: 'Rest, hydration, peppermint or lavender oil, cold/warm compress, magnesium supplement.'
    },
    {
      keywords: ['cough', 'cold', 'congestion', 'runny nose', 'running nose', 'stuffy nose', 'sneezing', 'nasal'],
      conditions: ['Common cold', 'Upper respiratory infection', 'Viral infection'],
      triageLevel: 'low',
      likelihood: 85,
      recommendation: 'Rest and supportive care. See healthcare provider if symptoms worsen or persist beyond 10 days.',
      naturalRemedies: 'Rest, honey and lemon tea, steam inhalation, warm salt water gargle, increased fluids.'
    },
    {
      keywords: ['fatigue', 'tired', 'exhausted', 'low energy'],
      conditions: ['Viral infection', 'Stress', 'Sleep deprivation', 'Nutritional deficiency'],
      triageLevel: 'low',
      likelihood: 75,
      recommendation: 'Ensure adequate rest and nutrition. See healthcare provider if fatigue persists.',
      naturalRemedies: 'Adequate sleep, balanced nutrition, light exercise, stress management, B-vitamin complex.'
    },
    {
      keywords: ['rash', 'skin irritation', 'itchy', 'hives'],
      conditions: ['Allergic reaction', 'Contact dermatitis', 'Eczema'],
      triageLevel: 'low',
      likelihood: 70,
      recommendation: 'Avoid known irritants. See healthcare provider if rash spreads or worsens.',
      naturalRemedies: 'Cool compresses, oatmeal baths, aloe vera, avoid irritants, loose clothing.'
    },
    {
      keywords: ['sore throat', 'throat pain', 'throat hurts', 'throat hurt'],
      conditions: ['Viral pharyngitis', 'Strep throat', 'Cold'],
      triageLevel: 'low',
      likelihood: 75,
      recommendation: 'Rest and supportive care. See healthcare provider if severe or persists more than 5 days.',
      naturalRemedies: 'Warm salt water gargle, honey and lemon tea, throat lozenges, steam inhalation.'
    },
    {
      keywords: ['itchy eyes', 'eye irritation', 'watery eyes', 'allergies', 'allergy'],
      conditions: ['Allergic conjunctivitis', 'Seasonal allergies', 'Environmental allergies'],
      triageLevel: 'low',
      likelihood: 80,
      recommendation: 'Avoid known allergens. See healthcare provider if symptoms persist or worsen.',
      naturalRemedies: 'Cool compresses, artificial tears, avoid allergens, air purifiers, nasal saline rinse.'
    },
    {
      keywords: ['vaginal burning', 'vaginal burn', 'vagina burns', 'vaginal odor', 'vaginal smell', 'vaginal discharge'],
      conditions: ['Vaginal infection', 'Yeast infection', 'Bacterial vaginosis'],
      triageLevel: 'medium',
      likelihood: 75,
      recommendation: 'See healthcare provider for proper diagnosis and treatment of vaginal symptoms.',
      naturalRemedies: 'Wear cotton underwear, avoid douching, maintain good hygiene, probiotics, avoid irritants.'
    }
  ];

  // Analyze symptoms and responses
  const symptomsLower = symptoms.toLowerCase();
  console.log('Analyzing symptoms text:', symptomsLower);
  
  const matchedPatterns: SymptomPattern[] = [];
  
  // Check for keyword matches in symptoms
  for (const pattern of symptomPatterns) {
    const hasMatch = pattern.keywords.some(keyword => 
      symptomsLower.includes(keyword.toLowerCase())
    );
    if (hasMatch) {
      console.log('Matched pattern:', pattern.conditions[0], 'for keywords:', pattern.keywords);
      matchedPatterns.push(pattern);
    }
  }
  
  console.log('Total matched patterns:', matchedPatterns.length);

  // Factor in interview responses
  let painLevel = responses.pain_level || 0;
  let hasFever = responses.fever || false;
  let duration = responses.duration || '';

  // Adjust triage level based on interview responses
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

  // Build conditions array
  const conditions: Condition[] = matchedPatterns.length > 0 
    ? matchedPatterns.map(pattern => ({
        name: pattern.conditions[0],
        likelihood: pattern.likelihood,
        recommendation: pattern.recommendation,
        naturalRemedies: pattern.naturalRemedies
      }))
    : [{
        name: 'General symptoms',
        likelihood: 50,
        recommendation: 'Monitor symptoms and consult healthcare provider if they worsen or persist.',
        naturalRemedies: 'Rest, stay hydrated, maintain good nutrition, and get adequate sleep.'
      }];

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