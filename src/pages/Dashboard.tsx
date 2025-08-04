import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, TrendingUp, User, Clock, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Assessment {
  id: string;
  created_at: string;
  symptom_description: string;
  triage_level: string;
  conditions: any;
}

interface SymptomData {
  id: string;
  symptom_name: string;
  severity: number;
  logged_at: string;
}

interface FactorData {
  id: string;
  factor_name: string;
  factor_value: string;
  logged_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomData[]>([]);
  const [factors, setFactors] = useState<FactorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    Promise.all([
      fetchAssessments(),
      fetchSymptoms(),
      fetchFactors()
    ]);
  }, [user, navigate]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  const fetchSymptoms = async () => {
    try {
      const { data, error } = await supabase
        .from('tracked_symptoms')
        .select('*')
        .eq('user_id', user?.id)
        .gte('logged_at', subDays(new Date(), 30).toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    }
  };

  const fetchFactors = async () => {
    try {
      const { data, error } = await supabase
        .from('tracked_factors')
        .select('*')
        .eq('user_id', user?.id)
        .gte('logged_at', subDays(new Date(), 30).toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      setFactors(data || []);
    } catch (error) {
      console.error('Error fetching factors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'destructive';
      case 'urgent': return 'secondary';
      case 'routine': return 'default';
      default: return 'outline';
    }
  };

  const getTriageIcon = (level: string) => {
    switch (level) {
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'urgent': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Prepare chart data
  const symptomChartData = symptoms.reduce((acc, symptom) => {
    const date = format(parseISO(symptom.logged_at), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing[symptom.symptom_name] = symptom.severity;
      existing.avgSeverity = (existing.avgSeverity + symptom.severity) / 2;
    } else {
      acc.push({
        date,
        [symptom.symptom_name]: symptom.severity,
        avgSeverity: symptom.severity
      });
    }
    return acc;
  }, [] as any[]);

  const symptomFrequencyData = symptoms.reduce((acc, symptom) => {
    const existing = acc.find(item => item.name === symptom.symptom_name);
    if (existing) {
      existing.count += 1;
      existing.avgSeverity = (existing.avgSeverity + symptom.severity) / 2;
    } else {
      acc.push({
        name: symptom.symptom_name,
        count: 1,
        avgSeverity: symptom.severity
      });
    }
    return acc;
  }, [] as any[]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Health Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile-selection')}>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">New Symptom Check</h3>
                      <p className="text-sm text-muted-foreground">Start a new health assessment</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/track-symptoms')}>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-3 rounded-full bg-secondary/50 w-fit mx-auto">
                      <TrendingUp className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Track Symptoms</h3>
                      <p className="text-sm text-muted-foreground">Log daily symptoms and factors</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-3 rounded-full bg-secondary/50 w-fit mx-auto">
                      <Calendar className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Assessment History</h3>
                      <p className="text-sm text-muted-foreground">{assessments.length} total assessments</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent Symptoms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{symptoms.length}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {symptoms.length > 0 
                        ? (symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length).toFixed(1)
                        : '0'
                      }/5
                    </div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Factors Tracked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{factors.length}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Symptom Trends Chart */}
              {symptoms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Symptom Severity Trends
                    </CardTitle>
                    <CardDescription>Your symptom severity over the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={symptomChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="avgSeverity" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Average Severity"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Symptom Frequency Chart */}
              {symptoms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Symptom Frequency
                    </CardTitle>
                    <CardDescription>How often you experience different symptoms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={symptomFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {symptoms.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="p-4 rounded-full bg-secondary/30 w-fit mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">No symptom data yet</h3>
                    <p className="text-muted-foreground mb-4">Start tracking symptoms to see analytics and trends</p>
                    <Button onClick={() => navigate('/track-symptoms')}>
                      Start Tracking
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {/* Recent Assessments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Assessment History</CardTitle>
                  <CardDescription>Your previous health check results</CardDescription>
                </CardHeader>
                <CardContent>
              {assessments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-secondary/30 w-fit mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No assessments yet</h3>
                  <p className="text-muted-foreground mb-4">Start your first symptom check to see results here</p>
                  <Button onClick={() => navigate('/profile-selection')}>
                    Start Assessment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getTriageIcon(assessment.triage_level)}
                          <Badge variant={getTriageColor(assessment.triage_level) as any}>
                            {assessment.triage_level}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium">{assessment.symptom_description.slice(0, 100)}...</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(assessment.created_at), 'MMM d, yyyy at h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {assessment.conditions && (
                          <p className="text-sm text-muted-foreground">
                            Top condition: {
                              typeof assessment.conditions === 'string' 
                                ? JSON.parse(assessment.conditions)[0]?.name 
                                : assessment.conditions[0]?.name
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {assessments.length >= 10 && (
                    <div className="text-center pt-4">
                      <Button variant="outline">View All Assessments</Button>
                    </div>
                  )}
                </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;