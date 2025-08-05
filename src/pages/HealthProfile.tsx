import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calculator, Heart, Target, Edit, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import HealthOnboarding from '@/components/HealthOnboarding';
import SEO from '@/components/SEO';
import { toast } from 'sonner';

interface Profile {
  full_name?: string;
  sex?: string;
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  emergency_contact?: string;
  preferred_units?: string;
  health_goals?: string[];
  activity_level?: string;
  onboarding_completed?: boolean;
  health_questionnaire_completed?: boolean;
}

interface HealthInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const HealthProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchHealthInsights();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      setProfile(data);
      
      // Show onboarding if profile is null or incomplete
      if (!data || !data.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
      // If no profile exists, show onboarding
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('health_insights')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const calculateAge = (birthDate: string) => {
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
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
    return { category: 'Obese', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: case 4: return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      case 3: return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
      default: return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (priority === 3) return <TrendingUp className="w-4 h-4 text-orange-600" />;
    return <Heart className="w-4 h-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <HealthOnboarding 
          onComplete={() => {
            setShowOnboarding(false);
            fetchProfile();
            fetchHealthInsights();
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <SEO 
        title="Health Profile - MDSDR.com"
        description="Manage your personal health profile, track BMI, medications, and get personalized health insights."
        keywords="health profile, BMI calculator, personal health, medical history, health tracking"
        url="https://mdsdr.com/health-profile"
      />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Health Profile</h1>
                <p className="text-sm text-muted-foreground">
                  {profile?.full_name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button onClick={() => setShowOnboarding(true)} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="health-data">Health Data</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Basic Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Basic Demographics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {profile?.date_of_birth && (
                        <p className="text-2xl font-bold">{calculateAge(profile.date_of_birth)} years</p>
                      )}
                      {profile?.sex && (
                        <p className="text-sm text-muted-foreground capitalize">{profile.sex}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* BMI Card */}
                {profile?.bmi && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        BMI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">{profile.bmi}</p>
                        <Badge className={getBmiCategory(profile.bmi).color}>
                          {getBmiCategory(profile.bmi).category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Health Conditions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">
                        {profile?.medical_conditions?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Active conditions</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Level */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm font-medium capitalize">
                        {profile?.activity_level?.replace('_', ' ') || 'Not set'}
                      </p>
                      <p className="text-xs text-muted-foreground">Activity level</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => navigate('/profile-selection')}
                    >
                      <Plus className="w-6 h-6" />
                      New Symptom Check
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => navigate('/track-symptoms')}
                    >
                      <TrendingUp className="w-6 h-6" />
                      Track Symptoms
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => navigate('/dashboard')}
                    >
                      <Heart className="w-6 h-6" />
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health-data" className="space-y-6">
              {/* Physical Measurements */}
              {(profile?.height_cm || profile?.weight_kg) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Physical Measurements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {profile.height_cm && (
                        <div>
                          <Label className="text-sm font-medium">Height</Label>
                          <p className="text-2xl font-bold">{profile.height_cm} cm</p>
                        </div>
                      )}
                      {profile.weight_kg && (
                        <div>
                          <Label className="text-sm font-medium">Weight</Label>
                          <p className="text-2xl font-bold">{profile.weight_kg} kg</p>
                        </div>
                      )}
                      {profile.bmi && (
                        <div>
                          <Label className="text-sm font-medium">BMI</Label>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">{profile.bmi}</p>
                            <Badge className={getBmiCategory(profile.bmi).color}>
                              {getBmiCategory(profile.bmi).category}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medical Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile?.medical_conditions && profile.medical_conditions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profile.medical_conditions.map((condition, index) => (
                          <Badge key={index} variant="secondary">{condition}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {profile?.allergies && profile.allergies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Allergies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profile.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive">{allergy}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {profile?.medications && profile.medications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profile.medications.map((medication, index) => (
                          <div key={index} className="p-2 bg-secondary/30 rounded text-sm">
                            {medication}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {profile?.health_goals && profile.health_goals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Health Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profile.health_goals.map((goal, index) => (
                          <Badge key={index} variant="outline">{goal}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(insight.priority)}
                          <div className="flex-1">
                            <h4 className="font-medium">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(insight.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No health insights yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Complete your health profile and start tracking symptoms to get personalized insights
                    </p>
                    <Button onClick={() => setShowOnboarding(true)}>
                      Complete Profile
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your health profile preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Units Preference</Label>
                      <p className="text-sm text-muted-foreground">
                        Currently: {profile?.preferred_units || 'metric'}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowOnboarding(true)}>
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Emergency Contact</Label>
                      <p className="text-sm text-muted-foreground">
                        {profile?.emergency_contact || 'Not set'}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowOnboarding(true)}>
                      Update
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Complete Health Assessment</Label>
                      <p className="text-sm text-muted-foreground">
                        Update your full health profile
                      </p>
                    </div>
                    <Button onClick={() => setShowOnboarding(true)}>
                      Update Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Add Label component for health data display
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

export default HealthProfile;