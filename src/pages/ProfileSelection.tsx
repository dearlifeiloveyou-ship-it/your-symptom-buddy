import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { User, Baby, UserPlus, ArrowRight, Heart, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { secureStorage } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

const ProfileSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<'myself' | 'child' | 'guest' | null>(null);
  const [guestInfo, setGuestInfo] = useState({
    age: '',
    sex: ''
  });
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile data when component mounts
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-orange-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const profileOptions = [
    {
      id: 'myself' as const,
      title: 'For myself',
      description: userProfile ? 
        `Get personalized health guidance based on your profile` : 
        'Get health guidance for your own symptoms',
      icon: User,
      available: !!user,
      enhanced: !!userProfile
    },
    {
      id: 'child' as const,
      title: 'For my child',
      description: 'Health guidance for your child or dependent',
      icon: Baby,
      available: !!user,
      enhanced: false
    },
    {
      id: 'guest' as const,
      title: 'Guest check',
      description: 'Quick symptom check without creating an account',
      icon: UserPlus,
      available: true,
      enhanced: false
    }
  ];

  const handleContinue = () => {
    const assessmentData = {
      profileType: selectedProfile,
      profileData: selectedProfile === 'guest' ? guestInfo : 
                   selectedProfile === 'myself' ? userProfile : null,
      step: 'symptoms',
      timestamp: Date.now()
    };
    
    secureStorage.set('currentAssessment', assessmentData);
    navigate('/symptom-input');
  };

  const isValid = selectedProfile && (
    selectedProfile !== 'guest' || 
    (guestInfo.age && guestInfo.sex)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <SEO 
        title="Start Symptom Check - MDSDR.com"
        description="Begin your AI-powered health assessment with MDSDR.com. Choose profile type and get personalized medical triage guidance for you, your child, or as a guest."
        keywords="start symptom check, health assessment, medical triage, symptom checker, AI diagnosis, health guidance, medical evaluation"
        url="https://mdsdr.com/profile-selection"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Progress value={16} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">Step 1 of 3: Select profile</p>
          </div>

          <Card className="shadow-lg border-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold text-primary">
                Who is this symptom check for?
              </CardTitle>
              <CardDescription>
                Select the profile to get personalized health guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {profileOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedProfile === option.id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:border-primary/30'
                      } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => option.available && setSelectedProfile(option.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className={`p-3 rounded-full ${
                          selectedProfile === option.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{option.title}</h3>
                            {option.enhanced && <Badge variant="secondary" className="text-xs">Personalized</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                          {!option.available && (
                            <p className="text-xs text-destructive mt-1">Please sign in to use this option</p>
                          )}
                          
                          {/* Show user profile preview for "myself" option */}
                          {option.id === 'myself' && userProfile && (
                            <div className="mt-2 p-2 bg-secondary/30 rounded-md">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {userProfile.date_of_birth && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {calculateAge(userProfile.date_of_birth)} years
                                  </div>
                                )}
                                {userProfile.bmi && (
                                  <div className="flex items-center gap-1">
                                    <Calculator className="w-3 h-3" />
                                    BMI: {userProfile.bmi}
                                  </div>
                                )}
                                {userProfile.medical_conditions && userProfile.medical_conditions.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {userProfile.medical_conditions.length} condition(s)
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedProfile === 'guest' && (
                <Card className="bg-secondary/30">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium text-primary">Basic information needed</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          placeholder="e.g. 25"
                          value={guestInfo.age}
                          onChange={(e) => setGuestInfo(prev => ({ ...prev, age: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sex">Sex</Label>
                        <Select 
                          value={guestInfo.sex} 
                          onValueChange={(value) => setGuestInfo(prev => ({ ...prev, sex: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                >
                  Back to Home
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

export default ProfileSelection;