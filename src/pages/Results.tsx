import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Download, Save, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generatePDFReport } from '@/utils/pdfGenerator';
import { secureStorage } from '@/lib/security';

interface Condition {
  name: string;
  likelihood: number;
  recommendation: string;
  naturalRemedies?: string;
}

interface TriageResult {
  triageLevel: 'low' | 'medium' | 'high';
  conditions: Condition[];
  actions: string;
}

const mockResults: TriageResult = {
  triageLevel: 'medium',
  actions: 'Based on your symptoms, you should consider seeing a healthcare provider within the next few days. Monitor your symptoms for any worsening, get adequate rest and stay hydrated.',
  conditions: [
    {
      name: 'Tension Headache',
      likelihood: 85,
      recommendation: 'Rest, hydration, and over-the-counter pain relief may help'
    },
    {
      name: 'Migraine',
      likelihood: 65,
      recommendation: 'Consider a quiet, dark room and consult with a healthcare provider'
    },
    {
      name: 'Sinus Headache',
      likelihood: 45,
      recommendation: 'Steam inhalation and decongestants may provide relief'
    }
  ]
};

const Results = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Clear any stale data first
    secureStorage.remove('currentAssessment');
    
    const assessmentData = secureStorage.get('currentAssessment');
    if (!assessmentData) {
      console.log('No assessment data found, redirecting to start');
      navigate('/profile-selection');
      return;
    }

    console.log('Assessment data found:', assessmentData);
    
    try {
      if (assessmentData.analysisResults) {
        console.log('Loading analysis results:', assessmentData.analysisResults);
        setResults(assessmentData.analysisResults);
      } else {
        console.log('No analysis results found in assessment data');
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

      if (error) throw error;

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
      const assessmentData = secureStorage.get('currentAssessment');
      if (results && assessmentData) {
        generatePDFReport({
          symptoms: assessmentData.symptoms || '',
          interviewResponses: assessmentData.interviewResponses || {},
          profileData: assessmentData.profileData,
          analysisResults: results
        }, user?.email);
        toast.success('PDF report generated and downloaded!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report.');
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
            </CardHeader>
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
                    <Badge variant="secondary">
                      {condition.likelihood}% likelihood
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{condition.recommendation}</p>
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

          {/* Medical Disclaimer */}
          <Card className="shadow-lg border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This assessment is for informational purposes only and does not replace professional medical advice. 
                Always consult with a healthcare provider for proper diagnosis and treatment.
              </p>
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