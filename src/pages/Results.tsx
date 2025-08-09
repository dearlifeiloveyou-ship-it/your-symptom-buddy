import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Download, Save, Home, Info, Brain, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generatePDFReport } from '@/utils/pdfGenerator';
import { secureStorage } from '@/lib/security';

interface Condition {
  name: string;
  likelihood: number;
  recommendation: string;
  naturalRemedies?: string;
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


const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<Set<number>>(new Set());

  useEffect(() => {
    const assessmentData = secureStorage.get('currentAssessment');
    if (!assessmentData) {
      navigate('/profile-selection');
      return;
    }

    console.log('Assessment data:', assessmentData);
    
    try {
      if (assessmentData.analysisResults) {
        console.log('Analysis results found:', assessmentData.analysisResults);
        setResults(assessmentData.analysisResults);
      } else {
        console.log('No analysis results - redirecting to restart');
        navigate('/profile-selection');
        return;
      }
    } catch (error) {
      console.error('Error loading assessment data:', error);
      navigate('/profile-selection');
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const getTriageConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          color: 'destructive',
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          title: 'High Priority',
          message: 'Seek medical care promptly'
        };
      case 'medium':
        return {
          color: 'secondary',
          icon: Clock,
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-300',
          title: 'Medium Priority',
          message: 'Consider consulting a healthcare provider'
        };
      case 'low':
        return {
          color: 'default',
          icon: CheckCircle,
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          title: 'Low Priority',
          message: 'Monitor symptoms and practice self-care'
        };
      default:
        return {
          color: 'secondary',
          icon: CheckCircle,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          title: 'Assessment Complete',
          message: 'Consult with a healthcare provider if needed'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">No results available</p>
          <Button onClick={() => navigate('/profile-selection')} className="mt-4">
            Start New Assessment
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveAssessment = async () => {
    if (!user) {
      toast.error('Please sign in to save your assessment');
      return;
    }

    if (!results) return;

    setIsSaving(true);
    try {
      const assessmentData = secureStorage.get('currentAssessment');
      
      const { error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          symptom_description: assessmentData?.symptoms || '',
          interview_responses: assessmentData?.interviewResponses || {},
          triage_level: results.triageLevel,
          conditions: JSON.stringify(results.conditions),
          next_steps: results.actions,
          api_results: {
            triageLevel: results.triageLevel,
            actions: results.actions,
            analysis_timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Update user stats
      await supabase.rpc('update_user_streak', { user_id_param: user.id });

      toast.success('Assessment saved successfully!');
      secureStorage.remove('currentAssessment');
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = () => {
    try {
      if (!results) {
        toast.error('No results to export.');
        return;
      }
      const assessmentData = secureStorage.get('currentAssessment');
      const payload = {
        symptoms: assessmentData?.symptoms || 'No symptom description provided',
        interviewResponses: assessmentData?.interviewResponses || {},
        profileData: assessmentData?.profileData,
        analysisResults: results
      } as const;

      generatePDFReport(payload as any, user?.email);
      toast.success('Preparing your PDF report...');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report.');
    }
  };

  const toggleConditionDetails = (index: number) => {
    const newExpanded = new Set(expandedConditions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConditions(newExpanded);
  };

  const getConfidenceColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'low': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const triageConfig = getTriageConfig(results.triageLevel);
  const TriageIcon = triageConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Triage Level Card */}
          <Card className={`shadow-lg border-l-4 border-l-primary ${triageConfig.bgColor}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${triageConfig.bgColor}`}>
                    <TriageIcon className={`w-6 h-6 ${triageConfig.textColor}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-xl ${triageConfig.textColor}`}>
                      {triageConfig.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {triageConfig.message}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {results.confidenceScore && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(results.confidenceScore * 100)}% confidence
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center gap-1"
                  >
                    <Brain className="w-4 h-4" />
                    Explain This
                    {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showExplanation && (
              <CardContent className="border-t bg-secondary/30">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      How We Determined This Assessment
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {results.reasoning || "This assessment was determined by analyzing your reported symptoms against medical guidelines and symptom patterns. The AI model considers symptom severity, duration, associated factors, and your responses to follow-up questions."}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Analysis Method</h4>
                    <Badge variant="outline" className="text-xs">
                      {results.analysisMethod === 'ai' ? 'AI-Powered Analysis' : 'Rule-Based Analysis'}
                    </Badge>
                  </div>

                  {results.limitationsNote && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Important Limitations</h5>
                      <p className="text-xs text-amber-700 dark:text-amber-300">{results.limitationsNote}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Possible Conditions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Possible Conditions</CardTitle>
              <CardDescription>
                Based on your symptoms, here are the most likely conditions (ordered by confidence)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.conditions.map((condition, index) => (
                <div key={index} className="p-4 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-primary">{condition.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {condition.likelihood}% likelihood
                      </Badge>
                      {condition.confidenceLevel && (
                        <Badge className={`text-xs ${getConfidenceColor(condition.confidenceLevel)}`}>
                          {condition.confidenceLevel} confidence
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleConditionDetails(index)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedConditions.has(index) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{condition.recommendation}</p>
                  
                  {expandedConditions.has(index) && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {condition.reasoning && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4" />
                            Why This Condition Was Suggested
                          </h5>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {condition.reasoning}
                          </p>
                        </div>
                      )}
                      
                      {condition.sources && condition.sources.length > 0 && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                          <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                            <ExternalLink className="w-4 h-4" />
                            Medical References
                          </h5>
                          <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                            {condition.sources.map((source, idx) => (
                              <li key={idx} className="truncate">• {source}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {condition.naturalRemedies && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                        <span>🌿</span> Natural Remedies
                      </h5>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {condition.naturalRemedies}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Recommended Actions</CardTitle>
              <CardDescription>
                Follow these recommendations for the best care
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{results.actions}</p>
            </CardContent>
          </Card>

          {/* Enhanced Medical Disclaimer */}
          <Card className="shadow-lg border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Medical Disclaimer</h4>
                    <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                      <p>
                        <strong>This AI assessment is for informational purposes only</strong> and does not replace professional medical advice, diagnosis, or treatment.
                      </p>
                      <p>
                        <strong>AI Limitations:</strong> This analysis is based on pattern recognition and may not account for rare conditions, complex interactions, or individual medical history nuances.
                      </p>
                      <p>
                        <strong>When to seek immediate care:</strong> If you experience severe symptoms, sudden changes, chest pain, difficulty breathing, severe bleeding, or feel your condition is urgent, contact emergency services or visit an emergency room immediately.
                      </p>
                      <p>
                        <strong>Always consult healthcare professionals</strong> for proper diagnosis, treatment decisions, and medical guidance tailored to your specific situation.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-amber-200 dark:border-amber-800 pt-3">
                  <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Data & Privacy</h5>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Your health data is encrypted and stored securely. This assessment does not create a doctor-patient relationship. 
                    You maintain full control over your data and can delete it at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
            
            {user && (
              <Button
                onClick={handleSaveAssessment}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Assessment'}
              </Button>
            )}
            
            <Button
              onClick={handleGeneratePDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </Button>
            
            <Button
              onClick={() => navigate('/profile-selection')}
              className="flex items-center gap-2"
            >
              New Assessment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;