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
  
  console.log("=== NEW SYMPTOM ANALYSIS SYSTEM ===");
  console.log("Analyzing:", symptoms);
  console.log("Responses:", responses);
  
  const normalizedSymptoms = symptoms.toLowerCase().trim();
  const matches = findSymptomMatches(normalizedSymptoms, responses);
  
  console.log(`Found ${matches.length} condition matches`);
  
  if (matches.length === 0) {
    console.log("No specific conditions identified");
    return createGenericResult(normalizedSymptoms, responses);
  }

  // Sort by likelihood and take top matches
  const sortedMatches = matches.sort((a, b) => b.likelihood - a.likelihood).slice(0, 3);
  
  // Determine triage level based on highest priority match and responses
  const triageLevel = calculateTriageLevel(sortedMatches, responses);
  
  console.log(`Final triage: ${triageLevel}`);
  
  return {
    triageLevel,
    conditions: sortedMatches,
    actions: getActionsForTriage(triageLevel)
  };
}

// New intelligent symptom matching system
function findSymptomMatches(symptoms: string, responses: Record<string, any>): Condition[] {
  const matches: Condition[] = [];
  
  console.log("Analyzing symptoms:", symptoms);
  
  // Male genital conditions
  if (symptoms.includes('testicle') || symptoms.includes('testical') || symptoms.includes('testicles') || symptoms.includes('testicals')) {
    if (symptoms.includes('lump') || symptoms.includes('mass') || symptoms.includes('swelling') || symptoms.includes('growth')) {
      matches.push({
        name: 'Testicular lump or mass',
        likelihood: 85,
        recommendation: 'Testicular lumps require immediate medical evaluation to rule out serious conditions including cancer. Schedule urgent appointment with healthcare provider.',
        naturalRemedies: 'Do not delay medical care. Avoid self-treatment for testicular lumps.'
      });
    }
    if (symptoms.includes('pain') || symptoms.includes('ache') || symptoms.includes('hurt')) {
      matches.push({
        name: 'Testicular pain',
        likelihood: 80,
        recommendation: 'Testicular pain can indicate various conditions from infection to torsion. Seek medical evaluation promptly.',
        naturalRemedies: 'Apply ice pack, wear supportive underwear, avoid heavy lifting while seeking medical care.'
      });
    }
  }

  // Female genital conditions
  if (symptoms.includes('vagina') || symptoms.includes('vaginal') || symptoms.includes('vulva')) {
    if (symptoms.includes('discharge') || symptoms.includes('smell') || symptoms.includes('odor')) {
      matches.push({
        name: 'Vaginal discharge with odor',
        likelihood: 82,
        recommendation: 'Abnormal vaginal discharge may indicate infection. See healthcare provider for proper diagnosis and treatment.',
        naturalRemedies: 'Wear cotton underwear, avoid douching, maintain good hygiene.'
      });
    }
    if (symptoms.includes('itch') || symptoms.includes('burning') || symptoms.includes('irritation')) {
      matches.push({
        name: 'Vaginal irritation',
        likelihood: 78,
        recommendation: 'Vaginal itching or burning may indicate yeast infection or other conditions. Consult healthcare provider.',
        naturalRemedies: 'Avoid scented products, wear loose clothing, consider probiotics.'
      });
    }
  }

  // Breast conditions
  if (symptoms.includes('breast') || symptoms.includes('boob') || symptoms.includes('chest')) {
    if (symptoms.includes('lump') || symptoms.includes('mass') || symptoms.includes('growth')) {
      matches.push({
        name: 'Breast lump',
        likelihood: 88,
        recommendation: 'Any new breast lump should be evaluated by a healthcare provider promptly to rule out serious conditions.',
        naturalRemedies: 'Do not delay medical evaluation. Continue regular breast self-exams.'
      });
    }
  }

  // Respiratory conditions
  if (symptoms.includes('cough') || symptoms.includes('shortness') || symptoms.includes('breathing') || symptoms.includes('wheeze')) {
    matches.push({
      name: 'Respiratory symptoms',
      likelihood: 75,
      recommendation: 'Monitor breathing difficulty. Seek immediate care if severe shortness of breath.',
      naturalRemedies: 'Rest, use humidifier, stay hydrated, avoid smoke and irritants.'
    });
  }

  // Gastrointestinal
  if (symptoms.includes('nausea') || symptoms.includes('vomit') || symptoms.includes('stomach') || symptoms.includes('diarrhea')) {
    matches.push({
      name: 'Gastrointestinal upset',
      likelihood: 72,
      recommendation: 'Stay hydrated. See provider if symptoms persist more than 2-3 days or if severe.',
      naturalRemedies: 'BRAT diet, clear fluids, rest, electrolyte replacement.'
    });
  }

  // Pain conditions
  if (symptoms.includes('pain') || symptoms.includes('ache') || symptoms.includes('hurt')) {
    let painLikelihood = 70;
    if (responses.pain_level >= 7) painLikelihood = 85;
    
    matches.push({
      name: 'Pain condition',
      likelihood: painLikelihood,
      recommendation: 'Evaluate pain severity and location. Seek care for severe or persistent pain.',
      naturalRemedies: 'Rest, ice or heat therapy, over-the-counter pain relief as appropriate.'
    });
  }

  // Skin conditions
  if (symptoms.includes('rash') || symptoms.includes('skin') || symptoms.includes('red') || symptoms.includes('bump')) {
    matches.push({
      name: 'Skin condition',
      likelihood: 68,
      recommendation: 'Keep area clean and dry. See provider if spreading, infected, or not improving.',
      naturalRemedies: 'Gentle cleansing, avoid irritants, moisturize if appropriate.'
    });
  }

  // Urinary symptoms
  if (symptoms.includes('urine') || symptoms.includes('burning') || symptoms.includes('uti') || symptoms.includes('bladder')) {
    matches.push({
      name: 'Urinary tract symptoms',
      likelihood: 84,
      recommendation: 'Urinary symptoms may indicate infection. See healthcare provider for testing.',
      naturalRemedies: 'Drink plenty of water, cranberry juice, avoid bladder irritants.'
    });
  }

  // Headache
  if (symptoms.includes('headache') || symptoms.includes('head') && symptoms.includes('pain')) {
    matches.push({
      name: 'Headache',
      likelihood: 73,
      recommendation: 'Rest in quiet, dark room. See provider for severe, frequent, or unusual headaches.',
      naturalRemedies: 'Cold compress, rest, hydration, over-the-counter pain relief.'
    });
  }

  // Emergency symptoms
  if (symptoms.includes('chest pain') || symptoms.includes('heart') || symptoms.includes('chest pressure')) {
    matches.push({
      name: 'Chest pain - Emergency',
      likelihood: 95,
      recommendation: 'Seek emergency medical attention immediately for any chest pain.',
      naturalRemedies: 'Call emergency services immediately - do not delay care.'
    });
  }

  console.log(`Matched ${matches.length} conditions:`, matches.map(m => m.name));
  return matches;
}

function createGenericResult(symptoms: string, responses: Record<string, any>): TriageResult {
  const painLevel = responses.pain_level || 0;
  
  let triageLevel: 'low' | 'medium' | 'high' = 'medium';
  if (painLevel >= 8) triageLevel = 'high';
  else if (painLevel <= 3) triageLevel = 'low';

  return {
    triageLevel,
    conditions: [{
      name: 'Symptoms requiring medical evaluation',
      likelihood: 60,
      recommendation: 'Your symptoms should be evaluated by a healthcare provider for proper diagnosis and treatment.',
      naturalRemedies: 'Rest, stay hydrated, monitor symptoms, and seek medical care for proper evaluation.'
    }],
    actions: getActionsForTriage(triageLevel)
  };
}

function calculateTriageLevel(matches: Condition[], responses: Record<string, any>): 'low' | 'medium' | 'high' {
  let triageLevel: 'low' | 'medium' | 'high' = 'low';
  
  // Check for emergency conditions
  if (matches.some(m => m.name.includes('Emergency') || m.name.includes('Chest pain'))) {
    return 'high';
  }
  
  // Check for high-priority conditions
  if (matches.some(m => m.name.includes('Testicular') || m.name.includes('Breast lump'))) {
    triageLevel = 'high';
  }
  
  // Check pain level
  const painLevel = responses.pain_level || 0;
  if (painLevel >= 8) {
    triageLevel = 'high';
  } else if (painLevel >= 6) {
    triageLevel = triageLevel === 'low' ? 'medium' : triageLevel;
  }
  
  // Check fever
  if (responses.fever && triageLevel === 'low') {
    triageLevel = 'medium';
  }
  
  // Default to medium for most conditions
  if (matches.length > 0 && triageLevel === 'low') {
    triageLevel = 'medium';
  }
  
  return triageLevel;
}

function getActionsForTriage(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'Seek emergency medical attention immediately. Do not delay care for potentially serious symptoms.';
    case 'medium':
      return 'Schedule an appointment with your healthcare provider within 24-48 hours. Monitor symptoms closely.';
    case 'low':
      return 'Practice self-care and monitor symptoms. Contact healthcare provider if symptoms worsen or persist.';
  }
}
