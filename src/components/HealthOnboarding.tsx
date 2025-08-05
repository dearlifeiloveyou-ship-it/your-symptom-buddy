import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, Heart, Users, Target, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HealthProfile {
  height_cm?: number;
  weight_kg?: number;
  sex?: string;
  date_of_birth?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  emergency_contact?: string;
  preferred_units?: 'metric' | 'imperial';
  health_goals?: string[];
  activity_level?: string;
}

interface HealthOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const HealthOnboarding = ({ onComplete, onSkip }: HealthOnboardingProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<HealthProfile>({
    preferred_units: 'metric',
    medical_conditions: [],
    allergies: [],
    medications: [],
    health_goals: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bmi, setBmi] = useState<number | null>(null);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Calculate BMI when height or weight changes
  useEffect(() => {
    if (profile.height_cm && profile.weight_kg) {
      const heightM = profile.height_cm / 100;
      const calculatedBmi = profile.weight_kg / (heightM * heightM);
      setBmi(Math.round(calculatedBmi * 10) / 10);
    } else {
      setBmi(null);
    }
  }, [profile.height_cm, profile.weight_kg]);

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-orange-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const addArrayItem = (field: keyof HealthProfile, value: string) => {
    if (value.trim()) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: keyof HealthProfile, index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          onboarding_completed: true,
          health_questionnaire_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Generate initial health insights
      await generateInitialInsights();
      
      toast.success('Health profile saved successfully!');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialInsights = async () => {
    if (!user || !bmi) return;

    try {
      const insights = [];

      // BMI insight
      const bmiCategory = getBmiCategory(bmi);
      insights.push({
        user_id: user.id,
        insight_type: 'bmi',
        title: `BMI: ${bmi} (${bmiCategory.category})`,
        description: getBmiRecommendation(bmi),
        priority: bmi < 18.5 || bmi >= 30 ? 3 : 1
      });

      // Activity level insights
      if (profile.activity_level === 'sedentary') {
        insights.push({
          user_id: user.id,
          insight_type: 'recommendation',
          title: 'Increase Physical Activity',
          description: 'Consider adding 30 minutes of moderate exercise to your daily routine for better health.',
          priority: 2
        });
      }

      // Medical conditions insights
      if (profile.medical_conditions && profile.medical_conditions.length > 0) {
        insights.push({
          user_id: user.id,
          insight_type: 'risk_factor',
          title: 'Medical Conditions Monitoring',
          description: `You have ${profile.medical_conditions.length} medical condition(s) to monitor. Regular check-ups are important.`,
          priority: 2
        });
      }

      await supabase.from('health_insights').insert(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const getBmiRecommendation = (bmi: number) => {
    if (bmi < 18.5) return 'Consider consulting with a healthcare provider about healthy weight gain strategies.';
    if (bmi < 25) return 'Great! You\'re in the healthy weight range. Maintain your current lifestyle.';
    if (bmi < 30) return 'Consider lifestyle changes to reach a healthier weight. Regular exercise and balanced nutrition can help.';
    return 'Consult with a healthcare provider about weight management strategies for your health.';
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Basic Information & BMI
        </CardTitle>
        <CardDescription>
          Help us understand your basic health profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <Select value={profile.sex} onValueChange={(value) => setProfile(prev => ({ ...prev, sex: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={profile.date_of_birth}
              onChange={(e) => setProfile(prev => ({ ...prev, date_of_birth: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="170"
              value={profile.height_cm || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, height_cm: parseInt(e.target.value) || undefined }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="70.0"
              value={profile.weight_kg || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) || undefined }))}
            />
          </div>
        </div>

        {bmi && (
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Your BMI</h4>
                  <p className={`text-2xl font-bold ${getBmiCategory(bmi).color}`}>
                    {bmi}
                  </p>
                  <p className={`text-sm ${getBmiCategory(bmi).color}`}>
                    {getBmiCategory(bmi).category}
                  </p>
                </div>
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {getBmiRecommendation(bmi)}
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Medical History
        </CardTitle>
        <CardDescription>
          Tell us about your medical conditions, allergies, and medications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ArrayInput
          label="Medical Conditions"
          placeholder="e.g., Diabetes, Hypertension"
          items={profile.medical_conditions || []}
          onAdd={(value) => addArrayItem('medical_conditions', value)}
          onRemove={(index) => removeArrayItem('medical_conditions', index)}
        />
        
        <ArrayInput
          label="Allergies"
          placeholder="e.g., Peanuts, Penicillin"
          items={profile.allergies || []}
          onAdd={(value) => addArrayItem('allergies', value)}
          onRemove={(index) => removeArrayItem('allergies', index)}
        />
        
        <ArrayInput
          label="Current Medications"
          placeholder="e.g., Aspirin 81mg daily"
          items={profile.medications || []}
          onAdd={(value) => addArrayItem('medications', value)}
          onRemove={(index) => removeArrayItem('medications', index)}
        />

        <div className="space-y-2">
          <Label htmlFor="emergency">Emergency Contact</Label>
          <Input
            id="emergency"
            placeholder="Name and phone number"
            value={profile.emergency_contact || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, emergency_contact: e.target.value }))}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lifestyle & Activity
        </CardTitle>
        <CardDescription>
          Help us understand your daily activity and lifestyle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Activity Level</Label>
          <Select value={profile.activity_level} onValueChange={(value) => setProfile(prev => ({ ...prev, activity_level: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select your activity level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
              <SelectItem value="light">Light (1-2 days/week)</SelectItem>
              <SelectItem value="moderate">Moderate (3-4 days/week)</SelectItem>
              <SelectItem value="active">Active (5-6 days/week)</SelectItem>
              <SelectItem value="very_active">Very Active (daily exercise)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Units Preference</Label>
          <Select value={profile.preferred_units} onValueChange={(value: 'metric' | 'imperial') => setProfile(prev => ({ ...prev, preferred_units: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric (cm, kg)</SelectItem>
              <SelectItem value="imperial">Imperial (ft, lbs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Health Goals
        </CardTitle>
        <CardDescription>
          What are your primary health goals? (Select all that apply)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Weight Management',
            'Improve Fitness',
            'Better Sleep',
            'Stress Management',
            'Manage Chronic Condition',
            'Preventive Care',
            'Mental Health',
            'Nutrition Improvement'
          ].map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <Checkbox
                id={goal}
                checked={profile.health_goals?.includes(goal)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    addArrayItem('health_goals', goal);
                  } else {
                    const index = profile.health_goals?.indexOf(goal) || -1;
                    if (index >= 0) removeArrayItem('health_goals', index);
                  }
                }}
              />
              <Label htmlFor={goal} className="text-sm font-normal">
                {goal}
              </Label>
            </div>
          ))}
        </div>

        {profile.health_goals && profile.health_goals.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Goals:</Label>
            <div className="flex flex-wrap gap-2">
              {profile.health_goals.map((goal, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {goal}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeArrayItem('health_goals', index)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-primary">Complete Your Health Profile</h2>
        <p className="text-muted-foreground">
          Help us provide more personalized health guidance
        </p>
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      <div className="flex justify-between">
        <div className="space-x-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Previous
            </Button>
          )}
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
        </div>
        
        <div className="space-x-2">
          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} className="flex items-center gap-2">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete Profile'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for array inputs
interface ArrayInputProps {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

const ArrayInput = ({ label, placeholder, items, onAdd, onRemove }: ArrayInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button type="button" onClick={handleAdd} size="sm">
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {item}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onRemove(index)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthOnboarding;