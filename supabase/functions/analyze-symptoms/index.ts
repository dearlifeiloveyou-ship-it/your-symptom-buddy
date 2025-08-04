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

    // Check for authentication (optional for anonymous access)
    const authHeader = req.headers.get('authorization');
    let userData = null;
    let isAuthenticated = false;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: userResponse, error: userError } = await supabaseService.auth.getUser(token);
      if (!userError && userResponse.user) {
        userData = userResponse;
        isAuthenticated = true;
      }
    }

    // For authenticated users, check subscription and usage limits
    if (isAuthenticated && userData) {
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

      if (subscriber) {
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
      }
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

    console.log('Analyzing symptoms for user:', { 
      userId: isAuthenticated ? userData?.user.id : 'anonymous',
      isAuthenticated 
    });

    // Store assessment in database only for authenticated users
    if (isAuthenticated && userData) {
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
        // Don't fail the request if storage fails, continue with analysis
      }
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
  
  console.log("=== STARTING SYMPTOM ANALYSIS ===");
  console.log("Raw symptom input:", symptoms);
  console.log("Interview responses:", responses);
  
  // Use the rebuilt symptom matching system
  const matchedPatterns = searchSymptoms(symptoms);
  
  if (matchedPatterns.length === 0) {
    console.log("NO PATTERNS MATCHED - Using fallback");
    return {
      triageLevel: 'medium',
      conditions: [{
        name: 'Unspecified symptoms requiring evaluation',
        likelihood: 50,
        recommendation: 'Your symptoms require professional medical evaluation. Please consult with a healthcare provider for proper assessment.',
        naturalRemedies: 'Maintain overall health with rest, hydration, and balanced nutrition while seeking professional care.'
      }],
      actions: 'Schedule an appointment with your healthcare provider for proper evaluation of your symptoms.'
    };
  }

  console.log(`Using ${matchedPatterns.length} matched patterns for analysis`);

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
  const normalizedText = symptomText.toLowerCase().trim();
  console.log(`=== SYMPTOM SEARCH DEBUG ===`);
  console.log(`Original input: "${symptomText}"`);
  console.log(`Normalized text: "${normalizedText}"`);
  
  const matches: Array<{ pattern: SymptomPattern; score: number; matchedWords: string[] }> = [];

  // Simple, reliable keyword matching
  COMPREHENSIVE_SYMPTOM_DATABASE.forEach((pattern, index) => {
    let score = 0;
    const matchedWords: string[] = [];

    // Check each keyword
    pattern.keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase().trim();
      
      // Simple contains check - very reliable
      if (normalizedText.includes(normalizedKeyword)) {
        matchedWords.push(keyword);
        score += 10;
        console.log(`✓ MATCH: "${keyword}" found in "${normalizedText}"`);
      }
    });

    // If any keywords matched, add to results
    if (score > 0) {
      matches.push({
        pattern,
        score,
        matchedWords
      });
      console.log(`Pattern ${index}: ${pattern.conditions[0]} - Score: ${score} - Matched: [${matchedWords.join(', ')}]`);
    }
  });

  console.log(`=== SEARCH RESULTS ===`);
  console.log(`Total patterns checked: ${COMPREHENSIVE_SYMPTOM_DATABASE.length}`);
  console.log(`Patterns with matches: ${matches.length}`);

  if (matches.length === 0) {
    console.log(`❌ NO MATCHES FOUND for "${normalizedText}"`);
    return [];
  }

  // Sort by score (highest first)
  const sortedMatches = matches.sort((a, b) => b.score - a.score);
  
  console.log(`=== TOP MATCHES ===`);
  sortedMatches.slice(0, 3).forEach((match, index) => {
    console.log(`${index + 1}. ${match.pattern.conditions[0]} (Score: ${match.score})`);
  });

  return sortedMatches.slice(0, 3).map(match => match.pattern);
}

// MEDICAL SYMPTOM DATABASE - BREAST SYMPTOMS FIRST FOR TESTING
const COMPREHENSIVE_SYMPTOM_DATABASE: SymptomPattern[] = [
  // === BREAST SYMPTOMS - ABSOLUTE FIRST PRIORITY ===
  {
    keywords: ['breast lump', 'lump in breast', 'breast mass', 'lump breast', 'hard lump', 'breast', 'lump'],
    conditions: ['Breast mass requiring immediate evaluation'],
    triageLevel: 'high',
    likelihood: 95,
    recommendation: 'URGENT: Schedule immediate medical evaluation for any breast lump.',
    naturalRemedies: 'Do not delay medical care. Seek immediate professional evaluation.'
  },
  {
    keywords: ['shortness of breath', 'can\'t breathe', 'difficulty breathing', 'gasping for air', 'breathing problems', 'dyspnea'],
    conditions: ['Acute respiratory distress', 'Asthma attack', 'Pulmonary embolism', 'Heart failure'],
    triageLevel: 'high',
    likelihood: 90,
    recommendation: 'EMERGENCY: Seek immediate medical attention for severe breathing difficulties.',
    naturalRemedies: 'Sit upright, stay calm, use rescue inhaler if available. Call 911 if severe.'
  },
  {
    keywords: ['severe abdominal pain', 'intense stomach pain', 'sharp belly pain', 'appendicitis', 'severe belly pain'],
    conditions: ['Appendicitis', 'Bowel obstruction', 'Perforated organ', 'Gallbladder emergency'],
    triageLevel: 'high',
    likelihood: 85,
    recommendation: 'EMERGENCY: Seek immediate medical evaluation for severe abdominal pain.',
    naturalRemedies: 'Do not eat or drink. Go to emergency room immediately.'
  },
  {
    keywords: ['loss of consciousness', 'fainting', 'passed out', 'blackout', 'syncope', 'fainted'],
    conditions: ['Syncope', 'Cardiac arrhythmia', 'Neurological emergency'],
    triageLevel: 'high',
    likelihood: 90,
    recommendation: 'EMERGENCY: Seek immediate medical care for loss of consciousness.',
    naturalRemedies: 'Lie flat with legs elevated. Call 911 if recurring or concerning symptoms.'
  },
  {
    keywords: ['severe headache', 'worst headache ever', 'sudden headache', 'thunderclap headache', 'splitting headache'],
    conditions: ['Possible stroke', 'Subarachnoid hemorrhage', 'Meningitis', 'Severe migraine'],
    triageLevel: 'high',
    likelihood: 85,
    recommendation: 'EMERGENCY: Call 911 for sudden severe headache.',
    naturalRemedies: 'Do not attempt self-treatment. Seek immediate emergency care.'
  },
  {
    keywords: ['weakness one side', 'facial drooping', 'slurred speech', 'difficulty speaking', 'stroke symptoms'],
    conditions: ['Stroke', 'TIA (mini-stroke)', 'Neurological emergency'],
    triageLevel: 'high',
    likelihood: 95,
    recommendation: 'EMERGENCY: Call 911 immediately. Possible stroke symptoms.',
    naturalRemedies: 'Do not attempt self-treatment. Call 911 immediately.'
  },
  {
    keywords: ['coughing blood', 'blood in cough', 'hemoptysis', 'bloody cough'],
    conditions: ['Serious lung condition', 'Pulmonary embolism', 'Lung infection', 'Tuberculosis'],
    triageLevel: 'high',
    likelihood: 90,
    recommendation: 'URGENT: Seek immediate medical attention for blood in cough.',
    naturalRemedies: 'Do not suppress cough. Seek immediate medical evaluation.'
  },

  // =================== WOMEN'S HEALTH & BREAST SYMPTOMS ===================
  {
    keywords: ['breast lump', 'lump in breast', 'breast mass', 'hard lump breast', 'breast tumor', 'growing lump', 'breast nodule'],
    conditions: ['Breast mass requiring urgent evaluation', 'Possible breast cancer', 'Fibroadenoma'],
    triageLevel: 'high',
    likelihood: 95,
    recommendation: 'URGENT: Schedule immediate medical evaluation. Any breast lump requires prompt assessment.',
    naturalRemedies: 'Do not delay medical care. This requires immediate professional evaluation.'
  },
  {
    keywords: ['breast pain', 'sore breast', 'tender breast', 'breast ache', 'breast tenderness'],
    conditions: ['Mastitis', 'Hormonal changes', 'Fibrocystic breast disease'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'See healthcare provider if pain persists or worsens.',
    naturalRemedies: 'Supportive bra, warm compress, over-the-counter pain relief.'
  },

  // =================== NEUROLOGICAL SYMPTOMS ===================
  {
    keywords: ['headache', 'head pain', 'migraine', 'tension headache', 'sinus headache'],
    conditions: ['Tension headache', 'Migraine', 'Cluster headache', 'Sinus headache'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Rest in dark room. See provider if severe or persistent.',
    naturalRemedies: 'Dark quiet room, cold compress, hydration, rest, over-the-counter pain relief.'
  },
  {
    keywords: ['dizziness', 'vertigo', 'lightheaded', 'spinning sensation', 'balance problems', 'dizzy'],
    conditions: ['Vertigo', 'Inner ear infection', 'Low blood pressure', 'Dehydration'],
    triageLevel: 'low',
    likelihood: 70,
    recommendation: 'Avoid sudden movements. See provider if persistent.',
    naturalRemedies: 'Sit or lie down, avoid sudden movements, stay hydrated, ginger tea.'
  },
  {
    keywords: ['numbness', 'tingling', 'pins and needles', 'limb weakness', 'numb hands', 'numb feet'],
    conditions: ['Peripheral neuropathy', 'Nerve compression', 'Vitamin deficiency'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'See healthcare provider for neurological evaluation.',
    naturalRemedies: 'Gentle movement, avoid repetitive motions, B vitamin supplements.'
  },

  // =================== RESPIRATORY SYMPTOMS ===================
  {
    keywords: ['cough', 'persistent cough', 'dry cough', 'productive cough', 'coughing'],
    conditions: ['Upper respiratory infection', 'Common cold', 'Bronchitis', 'Viral infection'],
    triageLevel: 'low',
    likelihood: 85,
    recommendation: 'Rest and fluids. See provider if persistent beyond 3 weeks.',
    naturalRemedies: 'Honey and warm water, humidifier, rest, throat lozenges, steam inhalation.'
  },
  {
    keywords: ['sore throat', 'throat pain', 'scratchy throat', 'swollen throat', 'strep throat'],
    conditions: ['Viral pharyngitis', 'Strep throat', 'Upper respiratory infection'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Rest and warm liquids. See provider if severe or fever present.',
    naturalRemedies: 'Warm salt water gargle, honey, throat lozenges, rest.'
  },
  {
    keywords: ['wheezing', 'asthma', 'tight breathing', 'chest tightness', 'breathing difficulty'],
    conditions: ['Asthma', 'Bronchitis', 'COPD', 'Allergic reaction'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'Use rescue inhaler if available. Seek care if breathing difficulty persists.',
    naturalRemedies: 'Sit upright, use inhaler, avoid triggers, calm breathing techniques.'
  },

  // =================== GASTROINTESTINAL SYMPTOMS ===================
  {
    keywords: ['nausea', 'vomiting', 'throwing up', 'feeling sick', 'queasy', 'sick stomach'],
    conditions: ['Gastroenteritis', 'Food poisoning', 'Viral infection', 'Motion sickness'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Rest and clear fluids. See provider if persistent vomiting or dehydration.',
    naturalRemedies: 'Clear fluids, BRAT diet, ginger tea, rest, small sips of water.'
  },
  {
    keywords: ['diarrhea', 'loose stools', 'watery stool', 'stomach bug', 'bowel problems'],
    conditions: ['Gastroenteritis', 'Food poisoning', 'Viral infection', 'IBS'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Stay hydrated. See provider if severe dehydration, fever, or blood in stool.',
    naturalRemedies: 'BRAT diet, electrolyte solutions, probiotics, rest, clear fluids.'
  },
  {
    keywords: ['stomach pain', 'belly ache', 'abdominal discomfort', 'indigestion', 'heartburn', 'acid reflux'],
    conditions: ['Indigestion', 'Gastritis', 'GERD', 'Food sensitivity'],
    triageLevel: 'low',
    likelihood: 70,
    recommendation: 'Monitor symptoms. Avoid trigger foods. See provider if severe or persistent.',
    naturalRemedies: 'Bland diet, small meals, avoid spicy foods, antacids, rest.'
  },
  {
    keywords: ['constipation', 'hard stool', 'difficulty bowel movement', 'straining', 'blocked bowels'],
    conditions: ['Constipation', 'IBS', 'Dehydration', 'Dietary issues'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Increase fiber and fluids. See provider if persistent or severe.',
    naturalRemedies: 'Fiber-rich foods, prunes, adequate water intake, regular exercise.'
  },

  // =================== MUSCULOSKELETAL SYMPTOMS ===================
  {
    keywords: ['back pain', 'lower back pain', 'spine pain', 'sciatica', 'backache'],
    conditions: ['Muscle strain', 'Herniated disc', 'Sciatica', 'Spinal stenosis'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Rest and gentle movement. See provider if severe or radiating pain.',
    naturalRemedies: 'Heat therapy, gentle stretching, proper posture, anti-inflammatory medication.'
  },
  {
    keywords: ['joint pain', 'arthritis', 'stiff joints', 'swollen joints', 'knee pain', 'hip pain'],
    conditions: ['Arthritis', 'Joint inflammation', 'Injury', 'Gout'],
    triageLevel: 'low',
    likelihood: 65,
    recommendation: 'Rest affected joint. See provider if severe pain or loss of function.',
    naturalRemedies: 'Ice for acute injury, heat for chronic pain, gentle movement, turmeric.'
  },
  {
    keywords: ['muscle pain', 'muscle ache', 'sore muscles', 'muscle strain', 'pulled muscle'],
    conditions: ['Muscle strain', 'Overuse injury', 'Viral myalgia', 'Exercise-induced soreness'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Rest and gentle stretching. See provider if severe or not improving.',
    naturalRemedies: 'Rest, ice or heat, gentle stretching, anti-inflammatory medication.'
  },

  // =================== CARDIOVASCULAR SYMPTOMS ===================
  {
    keywords: ['palpitations', 'heart racing', 'irregular heartbeat', 'heart skipping', 'rapid pulse'],
    conditions: ['Arrhythmia', 'Atrial fibrillation', 'Anxiety', 'Caffeine sensitivity'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Monitor symptoms. See provider if persistent or with chest pain.',
    naturalRemedies: 'Deep breathing, reduce caffeine, stay hydrated, relaxation techniques.'
  },
  {
    keywords: ['high blood pressure', 'hypertension', 'blood pressure', 'BP high'],
    conditions: ['Hypertension', 'Cardiovascular disease', 'Stress-related hypertension'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'Monitor regularly. See provider for management and medication adjustment.',
    naturalRemedies: 'Low sodium diet, regular exercise, stress reduction, weight management.'
  },

  // =================== GENERAL SYMPTOMS ===================
  {
    keywords: ['fever', 'high temperature', 'hot', 'burning up', 'feverish', 'temperature'],
    conditions: ['Viral infection', 'Bacterial infection', 'Inflammatory condition'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'Monitor temperature. See provider if fever >102°F, persistent >3 days, or with severe symptoms.',
    naturalRemedies: 'Rest, fluids, cool compresses, fever reducers as directed, light clothing.'
  },
  {
    keywords: ['fatigue', 'tired', 'exhausted', 'low energy', 'weakness', 'always tired'],
    conditions: ['Viral infection', 'Stress', 'Sleep deprivation', 'Anemia', 'Thyroid disorder'],
    triageLevel: 'low',
    likelihood: 70,
    recommendation: 'Ensure adequate rest. See provider if fatigue persists despite rest.',
    naturalRemedies: 'Adequate sleep, balanced nutrition, light exercise, stress management.'
  },
  {
    keywords: ['rash', 'skin rash', 'red bumps', 'itchy skin', 'hives', 'skin irritation'],
    conditions: ['Allergic reaction', 'Contact dermatitis', 'Viral rash', 'Eczema'],
    triageLevel: 'low',
    likelihood: 65,
    recommendation: 'Avoid irritants. See provider if spreading, severe, or with breathing issues.',
    naturalRemedies: 'Cool compresses, avoid scratching, gentle moisturizers, antihistamines.'
  },
  {
    keywords: ['swollen lymph nodes', 'lumps neck', 'enlarged glands', 'swollen glands', 'neck lumps'],
    conditions: ['Infection', 'Viral illness', 'Immune response', 'Rarely: lymphoma'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'See healthcare provider if swollen lymph nodes persist beyond 2 weeks.',
    naturalRemedies: 'Warm compresses, rest, monitor for changes, adequate hydration.'
  },

  // =================== MENTAL HEALTH SYMPTOMS ===================
  {
    keywords: ['anxiety', 'panic attack', 'worried', 'stressed', 'nervous', 'anxious'],
    conditions: ['Anxiety disorder', 'Panic disorder', 'Stress reaction', 'Generalized anxiety'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'Practice relaxation techniques. Seek professional help if persistent or severe.',
    naturalRemedies: 'Deep breathing, meditation, regular exercise, social support, limit caffeine.'
  },
  {
    keywords: ['depression', 'sad', 'hopeless', 'low mood', 'depressed', 'down'],
    conditions: ['Depression', 'Adjustment disorder', 'Mood disorder', 'Seasonal affective disorder'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Consider professional counseling. Seek immediate help if suicidal thoughts.',
    naturalRemedies: 'Regular exercise, social support, mindfulness, sunlight exposure, professional counseling.'
  },
  {
    keywords: ['insomnia', 'trouble sleeping', 'can\'t sleep', 'restless sleep', 'sleep problems'],
    conditions: ['Sleep disorder', 'Anxiety', 'Stress', 'Sleep hygiene issues'],
    triageLevel: 'low',
    likelihood: 80,
    recommendation: 'Practice good sleep hygiene. See provider if persistent sleep problems.',
    naturalRemedies: 'Regular sleep schedule, limit caffeine, dark room, relaxation techniques.'
  },

  // =================== URINARY & KIDNEY SYMPTOMS ===================
  {
    keywords: ['urinary', 'urine', 'bladder', 'kidney', 'burning urination', 'frequent urination', 'UTI'],
    conditions: ['UTI', 'Kidney stones', 'Bladder infection', 'Urinary tract infection'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Increase fluid intake and see healthcare provider. Seek urgent care if fever or severe pain.',
    naturalRemedies: 'Cranberry juice, increased water intake, avoid irritants, proper hygiene.'
  },

  // =================== EYE & VISION SYMPTOMS ===================
  {
    keywords: ['vision changes', 'blurred vision', 'loss of vision', 'double vision', 'seeing spots', 'eye pain'],
    conditions: ['Vision problems', 'Eye strain', 'Possible retinal issue', 'Migraine with aura'],
    triageLevel: 'high',
    likelihood: 80,
    recommendation: 'Seek immediate medical attention for sudden vision changes.',
    naturalRemedies: 'Do not rub eyes. Rest eyes from screens. Seek professional evaluation.'
  },

  // =================== ALLERGIC REACTIONS ===================
  {
    keywords: ['severe allergic reaction', 'anaphylaxis', 'swelling face', 'difficulty swallowing', 'hives all over'],
    conditions: ['Anaphylaxis', 'Severe allergic reaction', 'Angioedema'],
    triageLevel: 'high',
    likelihood: 95,
    recommendation: 'EMERGENCY: Use epinephrine if available and call 911 immediately.',
    naturalRemedies: 'Use epinephrine auto-injector if available, remove allergen, call 911 immediately.'
  }
];