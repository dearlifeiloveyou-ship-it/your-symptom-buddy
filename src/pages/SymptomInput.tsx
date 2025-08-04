import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const SymptomInput = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleInputChange = (value: string) => {
    setSymptoms(value);
    setIsValid(value.trim().length >= 10);
  };

  const handleContinue = () => {
    localStorage.setItem('currentAssessment', JSON.stringify({
      symptoms,
      step: 'interview'
    }));
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
                <Textarea
                  placeholder="Example: I've had a headache for 3 days that gets worse in bright light. I also feel nauseous and have trouble sleeping..."
                  value={symptoms}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="min-h-[150px] text-base"
                  maxLength={1000}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Minimum 10 characters for analysis</span>
                  <span>{symptoms.length}/1000</span>
                </div>
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
                  className="flex items-center gap-2"
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