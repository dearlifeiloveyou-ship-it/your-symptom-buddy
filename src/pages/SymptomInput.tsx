import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, ArrowLeft, Mic, Send } from 'lucide-react';
import { symptomSchema, secureStorage, sanitizeText } from '@/lib/security';
import VoiceInput from '@/components/VoiceInput';

const SymptomInput = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleInputChange = (value: string) => {
    setSymptoms(value);
    
    // Validate using schema without sanitization during typing
    const result = symptomSchema.safeParse(value);
    if (result.success) {
      setIsValid(true);
      setValidationError('');
    } else {
      setIsValid(false);
      setValidationError(result.error.errors[0].message);
    }
  };

  const handleContinue = () => {
    if (!isValid) return;
    
    // Sanitize only when saving/submitting
    const sanitizedSymptoms = sanitizeText(symptoms);
    
    // Get existing assessment data and merge with new symptoms
    const existingData = secureStorage.get('currentAssessment') || {};
    
    secureStorage.set('currentAssessment', {
      ...existingData,
      symptoms: sanitizedSymptoms,
      step: 'interview',
      timestamp: Date.now()
    });
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Progress value={33} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">Step 2 of 3: Describe your symptoms</p>
          </div>

          <Card className="shadow-lg border-primary/10">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-2xl font-semibold text-primary">
                Tell us about your symptoms
              </CardTitle>
              <CardDescription className="text-base">
                Describe your symptoms in detail. Include when they started, how severe they are, 
                and anything that makes them better or worse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Describe your symptoms</label>
                    <VoiceInput
                      onTranscript={(text) => {
                        const newText = symptoms ? `${symptoms} ${text}` : text;
                        handleInputChange(newText);
                      }}
                      sessionType="symptom_input"
                      className="flex-shrink-0"
                    />
                  </div>
                  <Textarea
                    placeholder="Example: I've had a headache for 3 days that gets worse in bright light. I also feel nauseous and have trouble sleeping... (or click the mic to speak)"
                    value={symptoms}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="min-h-[150px] text-base resize-none" // Prevent zoom on iOS
                    maxLength={2000}
                    style={{ fontSize: '16px' }} // Explicit font size for iOS
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Minimum 10 characters for analysis</span>
                  <span>{symptoms.length}/2000</span>
                </div>
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
              </div>

              <div className="bg-secondary/30 p-4 rounded-lg">
                <h4 className="font-medium text-primary mb-2">💡 Tips for better results:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Be specific about timing (when did it start?)</li>
                  <li>• Describe the intensity (mild, moderate, severe)</li>
                  <li>• Mention what triggers or relieves symptoms</li>
                  <li>• Include any related symptoms you've noticed</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/profile-selection')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleContinue}
                  disabled={!isValid}
                  className="flex items-center gap-2 min-h-[48px] w-full sm:w-auto"
                  size="lg"
                >
                  Continue
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

export default SymptomInput;