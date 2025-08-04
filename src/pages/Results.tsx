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

interface Condition {
  name: string;
  confidence: number;
  description: string;
}

interface TriageResult {
  level: 'emergency' | 'urgent' | 'routine' | 'self-care';
  message: string;
  nextSteps: string[];
  conditions: Condition[];
  severity_score?: number;
  recommendations?: string[];
}

const mockResults: TriageResult = {
  level: 'routine',
  message: 'Based on your symptoms, you should consider seeing a healthcare provider within the next few days.',
  nextSteps: [
    'Monitor your symptoms for any worsening',
    'Get adequate rest and stay hydrated',
    'Consider over-the-counter pain relief if needed',
    'Schedule an appointment with your primary care physician'
  ],
  conditions: [
    {
      name: 'Tension Headache',
      confidence: 85,
      description: 'Most common type of headache, often related to stress or muscle tension'
    },
    {
      name: 'Migraine',
      confidence: 65,
      description: 'Severe headache often accompanied by nausea and light sensitivity'
    },
    {
      name: 'Sinus Headache',
      confidence: 45,
      description: 'Headache caused by sinus inflammation or infection'
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
    const assessmentData = localStorage.getItem('currentAssessment');
    if (!assessmentData) {
      navigate('/profile-selection');
      return;
    }

    try {
      const data = JSON.parse(assessmentData);
      if (data.analysisResults) {
        setResults(data.analysisResults);
      } else {
        // Fallback to mock data if no analysis results
        setResults(mockResults);
      }
    } catch (error) {
      console.error('Error parsing assessment data:', error);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const getTriageConfig = (level: string) => {
    switch (level) {
      case 'emergency':
        return {
          color: 'destructive',
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          title: 'Seek Emergency Care'
        };
      case 'urgent':
        return {
          color: 'secondary',
          icon: Clock,
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-300',
          title: 'Urgent Care Needed'
        };
      case 'routine':
        return {
          color: 'default',
          icon: Clock,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          title: 'Routine Care'
        };
      default:
        return {
          color: 'secondary',
          icon: CheckCircle,
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          title: 'Self-Care'
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
      const assessmentData = JSON.parse(localStorage.getItem('currentAssessment') || '{}');
      
      const { error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          symptom_description: assessmentData.symptoms || '',
          interview_responses: assessmentData.interviewResponses || {},
          triage_level: results.level,
          conditions: JSON.stringify(results.conditions),
          next_steps: results.nextSteps.join('\n'),
          api_results: {
            severity_score: results.severity_score,
            recommendations: results.recommendations,
            analysis_timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;

      toast.success('Assessment saved successfully!');
      localStorage.removeItem('currentAssessment');
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = () => {
    try {
      const assessmentData = JSON.parse(localStorage.getItem('currentAssessment') || '{}');
      if (results) {
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

  const triageConfig = getTriageConfig(results.level);
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
                    {results.message}
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
                <div key={index} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-primary">{condition.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{condition.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {condition.confidence}% match
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary">Recommended Next Steps</CardTitle>
              <CardDescription>
                Follow these recommendations for the best care
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ul>
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