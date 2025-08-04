import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

// Rate limiting storage
const requestCounts = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(clientId: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(clientId);
  
  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (userLimit.count >= maxRequests) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"&]/g, (char) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return map[char] || char;
    })
    .trim()
    .slice(0, 2000);
}

function validateSymptoms(symptoms: string): string[] {
  const errors: string[] = [];
  
  if (!symptoms || symptoms.trim().length < 10) {
    errors.push('Symptoms description must be at least 10 characters');
  }
  
  if (symptoms.length > 2000) {
    errors.push('Symptoms description too long');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(symptoms))) {
    errors.push('Invalid content detected in symptoms');
  }
  
  return errors;
}

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

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                    req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    // Global rate limiting check
    if (isRateLimited(clientIp, 10, 300000)) { // 10 requests per 5 minutes
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // User-specific rate limiting
    if (isRateLimited(`user_${userData.user.id}`, 5, 600000)) { // 5 requests per 10 minutes per user
      return new Response(JSON.stringify({ error: 'User rate limit exceeded. Please wait before making another request.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // Check subscription and usage limits
    const { data: subscriber } = await supabaseService
      .from('subscribers')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();

    if (!subscriber) {
      return new Response(JSON.stringify({ error: "User subscription not found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Check if user has exceeded monthly limit (free tier)
    if (!subscriber.subscribed && subscriber.monthly_assessments_used >= subscriber.monthly_assessments_limit) {
      return new Response(JSON.stringify({ 
        error: "Monthly assessment limit reached. Please upgrade to continue.",
        requiresUpgrade: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // Increment usage counter for non-premium users
    if (!subscriber.subscribed) {
      await supabaseService
        .from('subscribers')
        .update({ monthly_assessments_used: subscriber.monthly_assessments_used + 1 })
        .eq('user_id', userData.user.id);
    }

    const requestBody = await req.json();
    const { symptoms, interviewResponses, profileData }: AnalysisRequest = requestBody;

    // Enhanced input validation
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(JSON.stringify({ error: "Valid symptoms description is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate and sanitize symptoms
    const validationErrors = validateSymptoms(symptoms);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: validationErrors.join(', ') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const sanitizedSymptoms = sanitizeInput(symptoms);

    console.log('Analyzing symptoms for authenticated user:', { userId: userData.user.id });

    // Store assessment in database with sanitized data
    const { error: insertError } = await supabaseService
      .from('assessments')
      .insert({
        user_id: userData.user.id,
        symptom_description: sanitizedSymptoms,
        interview_responses: interviewResponses,
        api_results: null, // Will be updated after analysis
        conditions: [],
        triage_level: 'green',
        next_steps: 'Analyzing...'
      });

    if (insertError) {
      console.error('Error storing assessment:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store assessment data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Perform rule-based medical analysis
    const analysisResult = await performMedicalAnalysis(sanitizedSymptoms, interviewResponses, profileData);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-symptoms function:', error);
    // Don't expose internal error details to prevent information leakage
    return new Response(JSON.stringify({ 
      error: 'An error occurred while analyzing symptoms. Please try again.'
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

// Enhanced comprehensive symptom database with improved accuracy
const COMPREHENSIVE_SYMPTOM_DATABASE: SymptomPattern[] = [
  // CARDIOVASCULAR & CIRCULATORY SYMPTOMS (R00-R09)
  {
    keywords: ['chest pain', 'heart attack', 'cardiac', 'crushing pain', 'pressure chest', 'angina', 'tight chest', 'squeezing chest'],
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
    keywords: ['urinary', 'urine', 'bladder', 'kidney', 'burning urination', 'frequent urination'],
    conditions: ['UTI', 'Kidney stones', 'Bladder infection'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Increase fluid intake and see healthcare provider.',
    naturalRemedies: 'Cranberry juice, increased water, avoid irritants.'
  },
  // GASTROINTESTINAL SYMPTOMS
  {
    keywords: ['stomach pain', 'indigestion', 'heartburn', 'acid reflux', 'bloating', 'gas'],
    conditions: ['GERD', 'Gastritis', 'Peptic ulcer', 'Dyspepsia'],
    triageLevel: 'low',
    likelihood: 70,
    recommendation: 'Monitor symptoms, avoid trigger foods. See provider if persistent.',
    naturalRemedies: 'Ginger tea, smaller meals, avoid spicy foods, elevate head while sleeping.'
  },
  {
    keywords: ['diarrhea', 'loose stools', 'watery stool', 'stomach bug'],
    conditions: ['Gastroenteritis', 'Food poisoning', 'IBS', 'Viral infection'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Stay hydrated, rest. See provider if fever or severe dehydration.',
    naturalRemedies: 'BRAT diet, electrolyte solutions, probiotics, rest.'
  },
  {
    keywords: ['constipation', 'hard stool', 'difficulty bowel movement', 'straining'],
    conditions: ['Constipation', 'IBS', 'Dehydration'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Increase fiber and fluids. See provider if persistent.',
    naturalRemedies: 'Fiber-rich foods, prunes, adequate water intake, regular exercise.'
  },
  // RESPIRATORY SYMPTOMS
  {
    keywords: ['wheezing', 'asthma', 'tight breathing', 'chest tightness'],
    conditions: ['Asthma', 'Bronchitis', 'COPD', 'Allergic reaction'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'Use rescue inhaler if available. Seek care if breathing difficulty persists.',
    naturalRemedies: 'Sit upright, use inhaler, avoid triggers, calm breathing techniques.'
  },
  {
    keywords: ['sore throat', 'throat pain', 'scratchy throat', 'swollen throat'],
    conditions: ['Viral pharyngitis', 'Strep throat', 'Common cold'],
    triageLevel: 'low',
    likelihood: 85,
    recommendation: 'Rest, warm liquids. See provider if severe or fever present.',
    naturalRemedies: 'Warm salt water gargle, honey and lemon, throat lozenges, rest.'
  },
  // NEUROLOGICAL SYMPTOMS
  {
    keywords: ['memory loss', 'forgetfulness', 'confusion', 'cognitive decline'],
    conditions: ['Mild cognitive impairment', 'Dementia', 'Depression', 'Medication side effects'],
    triageLevel: 'medium',
    likelihood: 60,
    recommendation: 'Schedule evaluation with healthcare provider for cognitive assessment.',
    naturalRemedies: 'Mental exercises, social engagement, regular exercise, adequate sleep.'
  },
  {
    keywords: ['numbness', 'tingling', 'pins and needles', 'limb weakness'],
    conditions: ['Peripheral neuropathy', 'Nerve compression', 'Vitamin deficiency'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'See healthcare provider for neurological evaluation.',
    naturalRemedies: 'Gentle movement, avoid repetitive motions, B vitamin supplements.'
  },
  // SKIN CONDITIONS
  {
    keywords: ['dry skin', 'itchy skin', 'eczema', 'dermatitis', 'scaly skin'],
    conditions: ['Atopic dermatitis', 'Contact dermatitis', 'Xerosis'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Moisturize regularly, avoid irritants. See provider if severe.',
    naturalRemedies: 'Gentle moisturizers, oatmeal baths, avoid harsh soaps, cool compresses.'
  },
  // MENTAL HEALTH
  {
    keywords: ['depression', 'sad', 'hopeless', 'low mood', 'crying'],
    conditions: ['Major depression', 'Adjustment disorder', 'Seasonal affective disorder'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Consider professional counseling. Seek immediate help if suicidal thoughts.',
    naturalRemedies: 'Regular exercise, sunlight exposure, social support, mindfulness.'
  },
  {
    keywords: ['insomnia', 'trouble sleeping', 'can\'t sleep', 'restless sleep'],
    conditions: ['Sleep disorder', 'Anxiety', 'Stress', 'Sleep hygiene issues'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Practice good sleep hygiene. See provider if persistent.',
    naturalRemedies: 'Regular sleep schedule, limit caffeine, dark room, relaxation techniques.'
  }
];