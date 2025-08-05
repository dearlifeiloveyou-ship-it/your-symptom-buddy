import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { secureStorage, sanitizeText } from '@/lib/security';

interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'scale' | 'multiple_choice';
  options?: string[];
}

// Mock questions - in real implementation, these would come from the medical API
const mockQuestions: Question[] = [
  {
    id: 'fever',
    text: 'Do you have a fever or feel feverish?',
    type: 'yes_no'
  },
  {
    id: 'pain_level',
    text: 'On a scale of 1-10, how would you rate your pain level?',
    type: 'scale'
  },
  {
    id: 'duration',
    text: 'How long have you been experiencing these symptoms?',
    type: 'multiple_choice',
    options: ['Less than 24 hours', '1-3 days', '3-7 days', 'More than a week']
  },
  {
    id: 'location',
    text: 'Where is the pain or discomfort located?',
    type: 'multiple_choice',
    options: ['Head/neck', 'Chest', 'Abdomen', 'Back', 'Arms/legs', 'Other']
  }
];

const Interview = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentQuestion = mockQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / mockQuestions.length) * 50 + 50; // 50-100% range

  useEffect(() => {
    const assessmentData = secureStorage.get('currentAssessment');
    if (!assessmentData) {
      navigate('/profile-selection');
      return;
    }
    
    // Check if assessment is stale (older than 1 hour)
    const isStale = assessmentData.timestamp && (Date.now() - assessmentData.timestamp > 3600000);
    if (isStale) {
      secureStorage.clear();
      navigate('/profile-selection');
      return;
    }
  }, [navigate]);

  const handleResponse = (value: any) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < mockQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const assessmentData = secureStorage.get('currentAssessment');
      if (!assessmentData || !assessmentData.symptoms) {
        toast.error('Assessment data not found. Please start over.');
        navigate('/profile-selection');
        return;
      }
      
      console.log('Starting analysis with data:', {
        symptoms: assessmentData.symptoms,
        responses: Object.keys(responses).length,
        profileType: assessmentData.profileData?.profileType
      });
      
      // Sanitize all response data
      const sanitizedResponses = Object.fromEntries(
        Object.entries(responses).map(([key, value]) => [
          key,
          typeof value === 'string' ? sanitizeText(value) : value
        ])
      );
      
      // Call the medical analysis API
      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: {
          symptoms: sanitizeText(assessmentData.symptoms || ''),
          interviewResponses: sanitizedResponses,
          profileData: assessmentData.profileData
        }
      });

      console.log('Analysis response:', { data, error });

      if (error) {
        console.error('Analysis error details:', error);
        if (error.message?.includes('Monthly assessment limit')) {
          toast.error('Monthly assessment limit reached. Please upgrade to continue.');
          navigate('/premium');
          return;
        } else if (error.message?.includes('rate limit')) {
          toast.error('Too many requests. Please wait a moment and try again.');
          return;
        } else if (error.message?.includes('Invalid content')) {
          toast.error('Please check your symptom description for invalid content.');
          navigate('/symptom-input');
          return;
        }
        throw error;
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.error('Invalid response structure:', data);
        toast.error('Received invalid response. Please try again.');
        return;
      }

      // Update secure storage with API results
      const updatedAssessment = {
        ...assessmentData,
        interviewResponses: sanitizedResponses,
        analysisResults: data,
        step: 'results',
        timestamp: Date.now()
      };
      secureStorage.set('currentAssessment', updatedAssessment);
      
      toast.success('Analysis complete!');
      navigate('/results');
    } catch (error) {
      console.error('Analysis error:', error);
      
      // More specific error messages
      if (error.message?.includes('Assessment data not found')) {
        toast.error('Session expired. Please start a new assessment.');
        navigate('/profile-selection');
      } else if (error.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('There was an error analyzing your symptoms. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuestionInput = () => {
    const currentResponse = responses[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'yes_no':
        return (
          <div className="flex gap-4 justify-center">
            <Button
              variant={currentResponse === true ? 'default' : 'outline'}
              onClick={() => handleResponse(true)}
              className="w-24"
            >
              Yes
            </Button>
            <Button
              variant={currentResponse === false ? 'default' : 'outline'}
              onClick={() => handleResponse(false)}
              className="w-24"
            >
              No
            </Button>
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>1 (Mild)</span>
              <span>10 (Severe)</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <Button
                  key={num}
                  variant={currentResponse === num ? 'default' : 'outline'}
                  onClick={() => handleResponse(num)}
                  className="h-10 w-full min-h-[44px] text-sm"
                  size="sm"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <Button
                key={index}
                variant={currentResponse === option ? 'default' : 'outline'}
                onClick={() => handleResponse(option)}
                className="w-full justify-start"
              >
                {option}
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-lg font-medium">Analyzing your responses...</h3>
            <p className="text-muted-foreground">This may take a moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Step 3 of 3: Question {currentQuestionIndex + 1} of {mockQuestions.length}
            </p>
          </div>

          <Card className="shadow-lg border-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-primary">
                {currentQuestion.text}
              </CardTitle>
              <CardDescription>
                Please answer to help us provide better guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {renderQuestionInput()}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 min-h-[48px] order-2 sm:order-1"
                  size="lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={responses[currentQuestion.id] === undefined}
                  className="flex items-center gap-2 min-h-[48px] order-1 sm:order-2"
                  size="lg"
                >
                  {currentQuestionIndex === mockQuestions.length - 1 ? 'Complete' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Interview;