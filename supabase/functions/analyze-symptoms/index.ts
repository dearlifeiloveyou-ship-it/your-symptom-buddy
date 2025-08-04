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

// Completely rebuilt symptom matching system
function searchSymptoms(symptomText: string): SymptomPattern[] {
  const text = symptomText.toLowerCase().trim();
  console.log(`Searching for symptoms in: "${text}"`);
  
  const matches: SymptomPattern[] = [];
  
  // Check each pattern in the database
  for (const pattern of SYMPTOM_DATABASE) {
    // Check if any keyword matches
    const hasMatch = pattern.keywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      const isMatch = text.includes(keywordLower);
      if (isMatch) {
        console.log(`MATCH FOUND: "${keywordLower}" in "${text}"`);
      }
      return isMatch;
    });
    
    if (hasMatch) {
      matches.push(pattern);
    }
  }
  
  console.log(`Found ${matches.length} matching symptoms`);
  return matches.slice(0, 3); // Return top 3 matches
}

// Comprehensive symptom database - rebuilt from scratch
const SYMPTOM_DATABASE: SymptomPattern[] = [
  // Gynecological symptoms
  {
    keywords: ['vagina', 'vaginal', 'discharge', 'yeast infection', 'itch', 'burning', 'smell', 'odor'],
    conditions: ['Vaginal infection or inflammation'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'See healthcare provider for proper diagnosis and treatment of vaginal symptoms.',
    naturalRemedies: 'Wear cotton underwear, avoid douching, maintain good hygiene.'
  },
  
  // Urinary symptoms  
  {
    keywords: ['urine', 'burning', 'painful urination', 'uti', 'bladder'],
    conditions: ['Urinary tract infection'],
    triageLevel: 'medium',
    likelihood: 85,
    recommendation: 'See healthcare provider for urine testing and antibiotic treatment if needed.',
    naturalRemedies: 'Drink plenty of water, cranberry juice, avoid irritants.'
  },
  
  // Respiratory symptoms
  {
    keywords: ['cough', 'shortness of breath', 'difficulty breathing', 'wheeze'],
    conditions: ['Respiratory condition'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Monitor breathing. Seek immediate care if severe difficulty breathing.',
    naturalRemedies: 'Rest, humidifier, warm liquids, avoid smoke.'
  },
  
  // Pain symptoms
  {
    keywords: ['pain', 'ache', 'hurt', 'sore', 'sharp pain', 'dull pain'],
    conditions: ['Pain requiring evaluation'],
    triageLevel: 'medium',
    likelihood: 70,
    recommendation: 'Evaluate pain level and location. Seek care for severe or persistent pain.',
    naturalRemedies: 'Rest, ice or heat therapy, over-the-counter pain relief as appropriate.'
  },
  
  // Digestive symptoms
  {
    keywords: ['nausea', 'vomit', 'stomach', 'belly', 'diarrhea', 'constipation'],
    conditions: ['Digestive issue'],
    triageLevel: 'low',
    likelihood: 75,
    recommendation: 'Stay hydrated. See provider if symptoms persist or worsen.',
    naturalRemedies: 'BRAT diet, clear fluids, rest, probiotics.'
  },
  
  // Fever and infection
  {
    keywords: ['fever', 'temperature', 'chills', 'infection', 'sick'],
    conditions: ['Infection or illness'],
    triageLevel: 'medium',
    likelihood: 80,
    recommendation: 'Monitor temperature. See provider for high fever or if symptoms worsen.',
    naturalRemedies: 'Rest, fluids, fever reducers as directed by provider.'
  },
  
  // Headache
  {
    keywords: ['headache', 'head pain', 'migraine'],
    conditions: ['Headache'],
    triageLevel: 'low',
    likelihood: 70,
    recommendation: 'Rest in quiet, dark room. See provider for severe or frequent headaches.',
    naturalRemedies: 'Cold compress, rest, hydration, over-the-counter pain relief.'
  },
  
  // Skin issues
  {
    keywords: ['rash', 'skin', 'red', 'swelling', 'bump'],
    conditions: ['Skin condition'],
    triageLevel: 'low',
    likelihood: 65,
    recommendation: 'Keep area clean and dry. See provider if spreading or infected.',
    naturalRemedies: 'Gentle cleansing, avoid irritants, moisturize if appropriate.'
  },
  
  // Chest symptoms
  {
    keywords: ['chest pain', 'heart', 'chest pressure'],
    conditions: ['Chest pain requiring immediate evaluation'],
    triageLevel: 'high',
    likelihood: 90,
    recommendation: 'Seek emergency care immediately for any chest pain.',
    naturalRemedies: 'Call emergency services - do not delay care for chest pain.'
  },
  
  // Mental health
  {
    keywords: ['anxiety', 'depression', 'panic', 'stress', 'worried'],
    conditions: ['Mental health concern'],
    triageLevel: 'medium',
    likelihood: 75,
    recommendation: 'Consider speaking with a mental health professional or primary care provider.',
    naturalRemedies: 'Deep breathing, exercise, adequate sleep, support from friends/family.'
  }
];