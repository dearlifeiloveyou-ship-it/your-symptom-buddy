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
  reasoning?: string;
  confidenceLevel?: 'high' | 'medium' | 'low';
  sources?: string[];
}

interface TriageResult {
  triageLevel: 'low' | 'medium' | 'high';
  conditions: Condition[];
  actions: string;
  reasoning?: string;
  confidenceScore?: number;
  analysisMethod?: 'ai' | 'rule-based';
  limitationsNote?: string;
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
      const { data: subscriber, error: subscriberError } = await supabaseService
        .from('subscribers')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (subscriberError) {
        console.error('Error fetching subscriber data:', subscriberError);
      }

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
    let assessmentId = null;
    if (isAuthenticated && userData) {
      try {
        const { data: assessment, error: insertError } = await supabaseService
          .from('assessments')
          .insert({
            user_id: userData.user.id,
            symptom_description: sanitizedSymptoms,
            interview_responses: interviewResponses,
            api_results: null, // Will be updated after analysis
            conditions: [],
            triage_level: 'self_care',
            next_steps: 'Analyzing...'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error storing assessment:', insertError);
          // Don't fail the request if storage fails, continue with analysis
        } else {
          assessmentId = assessment?.id;
          console.log('Assessment stored with ID:', assessmentId);
        }
      } catch (error) {
        console.error('Unexpected error storing assessment:', error);
      }
    }

    // Perform rule-based medical analysis
    console.log('Starting medical analysis with data:', {
      symptomsLength: sanitizedSymptoms.length,
      responsesCount: Object.keys(interviewResponses).length,
      profileType: profileData?.profileType,
      isAuthenticated
    });

    const analysisResult = await performMedicalAnalysis(sanitizedSymptoms, interviewResponses, profileData);

    console.log('Analysis completed successfully:', {
      triageLevel: analysisResult.triageLevel,
      conditionsCount: analysisResult.conditions?.length || 0,
      analysisMethod: analysisResult.analysisMethod
    });

    // Map AI triage levels to database constraint values
    const mapTriageLevel = (aiLevel: string) => {
      switch (aiLevel) {
        case 'high': return 'urgent';
        case 'medium': return 'routine';
        case 'low': return 'self_care';
        case 'emergency': return 'emergency';
        default: return 'self_care';
      }
    };

    // Update assessment with results if we have an assessment ID
    if (assessmentId && isAuthenticated) {
      try {
        const mappedTriageLevel = mapTriageLevel(analysisResult.triageLevel || 'low');
        await supabaseService
          .from('assessments')
          .update({
            api_results: analysisResult,
            conditions: analysisResult.conditions || [],
            triage_level: mappedTriageLevel,
            next_steps: analysisResult.actions || 'No specific actions recommended'
          })
          .eq('id', assessmentId);
        console.log('Assessment updated successfully with triage level:', mappedTriageLevel);
      } catch (updateError) {
        console.error('Error updating assessment:', updateError);
      }
    }

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
  
  console.log("=== AI-POWERED SYMPTOM ANALYSIS ===");
  console.log("Analyzing:", symptoms);
  console.log("Responses:", responses);
  
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (openAIApiKey) {
    console.log("Using OpenAI for enhanced symptom analysis");
    try {
      return await performAIAnalysis(symptoms, responses, profile, openAIApiKey);
    } catch (error) {
      console.error("OpenAI analysis failed, falling back to rule-based:", error);
      return await performRuleBasedAnalysis(symptoms, responses);
    }
  } else {
    console.log("No OpenAI key found, using rule-based analysis");
    return await performRuleBasedAnalysis(symptoms, responses);
  }
}

async function performAIAnalysis(
  symptoms: string,
  responses: Record<string, any>,
  profile: any,
  apiKey: string
): Promise<TriageResult> {
  
  // Build context for AI
  let contextInfo = `Patient Information:
- Symptoms: ${symptoms}
- Pain Level: ${responses.pain_level || 'Not specified'}/10
- Fever: ${responses.fever ? 'Yes' : 'No'}
- Duration: ${responses.duration || 'Not specified'}
- Location: ${responses.location || 'Not specified'}`;

  if (profile) {
    contextInfo += `
- Age: ${profile.age || 'Not specified'}
- Sex: ${profile.sex || 'Not specified'}`;
  }

  const systemPrompt = `You are an experienced medical AI assistant specializing in symptom analysis and triage. Your role is to analyze symptoms and provide structured medical guidance.

CRITICAL INSTRUCTIONS:
- You are NOT diagnosing - you are providing guidance and triage
- Always recommend professional medical care when appropriate
- Focus on evidence-based medicine
- Consider symptom patterns, severity, and risk factors
- Provide clear triage levels: low, medium, or high priority

For each analysis, provide:
1. 1-3 most likely conditions (not diagnoses)
2. Appropriate triage level
3. Specific recommendations
4. Natural remedies when safe and appropriate

RESPONSE FORMAT: You must respond in valid JSON format with this exact structure:
{
  "triageLevel": "low|medium|high",
  "reasoning": "Detailed explanation of how you arrived at this triage level",
  "confidenceScore": 0.85,
  "analysisMethod": "ai",
  "limitationsNote": "Specific limitations of this analysis",
  "conditions": [
    {
      "name": "Condition name",
      "likelihood": 75,
      "recommendation": "Specific medical recommendation",
      "reasoning": "Why this condition was suggested based on symptoms",
      "confidenceLevel": "high|medium|low",
      "sources": ["Brief medical guideline reference"],
      "naturalRemedies": "Safe natural remedies if applicable"
    }
  ],
  "actions": "Clear next steps for the patient"
}

TRIAGE GUIDELINES:
- HIGH: Emergency symptoms (chest pain, severe bleeding, difficulty breathing, severe head injury)
- MEDIUM: Concerning symptoms needing prompt care (persistent pain, fever >101°F, unusual changes)
- LOW: Minor symptoms manageable with self-care (mild cold, minor cuts, mild headache)

Remember: This is guidance only, not medical diagnosis. Always recommend professional care for concerning symptoms.`;

  console.log("Calling OpenAI for symptom analysis...");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please analyze these symptoms and provide triage guidance:\n\n${contextInfo}` }
      ],
      temperature: 0.3, // Lower temperature for more consistent medical responses
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  console.log("OpenAI raw response:", aiResponse);

  try {
    // Parse the JSON response
    const analysisResult = JSON.parse(aiResponse);
    
    // Validate the response structure
    if (!analysisResult.triageLevel || !analysisResult.conditions || !analysisResult.actions) {
      throw new Error('Invalid AI response structure');
    }

    console.log("AI analysis successful:", analysisResult);
    return analysisResult;
    
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    throw new Error('Invalid AI response format');
  }
}

async function performRuleBasedAnalysis(symptoms: string, responses: Record<string, any>): Promise<TriageResult> {
  console.log("Using rule-based analysis as fallback");
  
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
    actions: getActionsForTriage(triageLevel),
    reasoning: `Rule-based analysis considered symptom severity, duration, and associated factors. Triage level determined by pain level (${responses.pain_level || 'unknown'}/10), fever presence (${responses.fever ? 'yes' : 'no'}), and symptom duration.`,
    confidenceScore: 0.7,
    analysisMethod: 'rule-based' as const,
    limitationsNote: 'This rule-based analysis uses common symptom patterns and may not capture complex or rare conditions. Consider individual medical history and seek professional evaluation.'
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
        reasoning: 'Any palpable testicular mass requires urgent evaluation due to potential for testicular cancer, which is highly treatable when caught early.',
        confidenceLevel: 'high' as const,
        sources: ['American Cancer Society testicular cancer guidelines', 'Urology care guidelines'],
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
      reasoning: 'Symptoms did not match specific patterns in our database, indicating need for professional medical evaluation.',
      confidenceLevel: 'low' as const,
      sources: ['General medical evaluation guidelines'],
      naturalRemedies: 'Rest, stay hydrated, monitor symptoms, and seek medical care for proper evaluation.'
    }],
    actions: getActionsForTriage(triageLevel),
    reasoning: `Generic assessment based on reported symptoms and pain level (${painLevel}/10). No specific condition patterns identified.`,
    confidenceScore: 0.5,
    analysisMethod: 'rule-based' as const,
    limitationsNote: 'No specific symptom patterns identified. Professional medical evaluation recommended for accurate diagnosis.'
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
