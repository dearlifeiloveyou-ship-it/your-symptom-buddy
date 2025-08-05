import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, TrendingUp, User, Clock, AlertTriangle, BarChart3, Activity, Brain, Download, FileText, Target, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { generatePDFReport } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import PricingSection from '@/components/PricingSection';

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
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedSymptom, setSelectedSymptom] = useState<string>('all');
  const [healthInsights, setHealthInsights] = useState<any>(null);

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
      const daysBack = parseInt(timeRange);
      const { data, error } = await supabase
        .from('tracked_symptoms')
        .select('*')
        .eq('user_id', user?.id)
        .gte('logged_at', subDays(new Date(), daysBack).toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    }
  };

  const fetchFactors = async () => {
    try {
      const daysBack = parseInt(timeRange);
      const { data, error } = await supabase
        .from('tracked_factors')
        .select('*')
        .eq('user_id', user?.id)
        .gte('logged_at', subDays(new Date(), daysBack).toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      setFactors(data || []);
    } catch (error) {
      console.error('Error fetching factors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Health insights calculation
  useEffect(() => {
    if (symptoms.length > 0) {
      generateHealthInsights();
    }
  }, [symptoms, factors]);

  // Refetch data when time range changes
  useEffect(() => {
    if (user) {
      fetchSymptoms();
      fetchFactors();
    }
  }, [timeRange, user]);

  const generateHealthInsights = () => {
    const insights: any = {
      trends: {},
      recommendations: [],
      riskFactors: [],
      improvements: []
    };

    // Analyze symptom trends
    const symptomsByName = symptoms.reduce((acc, symptom) => {
      if (!acc[symptom.symptom_name]) acc[symptom.symptom_name] = [];
      acc[symptom.symptom_name].push(symptom);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(symptomsByName).forEach(([name, data]) => {
      const recent = data.slice(-7); // Last 7 entries
      const older = data.slice(0, -7);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, s) => sum + s.severity, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.severity, 0) / older.length;
        const change = recentAvg - olderAvg;
        
        insights.trends[name] = {
          change: change,
          direction: change > 0.5 ? 'worsening' : change < -0.5 ? 'improving' : 'stable',
          recentAverage: Math.round(recentAvg * 10) / 10
        };

        if (change > 1) {
          insights.recommendations.push(`Your ${name} symptoms have worsened recently. Consider consulting a healthcare provider.`);
        } else if (change < -1) {
          insights.improvements.push(`Great progress! Your ${name} symptoms are improving.`);
        }
      }
    });

    setHealthInsights(insights);
  };

  const exportHealthData = async () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        timeRange: `${timeRange} days`,
        symptoms: symptoms,
        factors: factors,
        assessments: assessments,
        insights: healthInsights
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Health data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export health data');
    }
  };

  const generateComprehensivePDF = () => {
    try {
      if (symptoms.length === 0 && assessments.length === 0) {
        toast.error('No health data available to generate report');
        return;
      }

      generatePDFReport({
        symptoms: JSON.stringify(symptoms),
        factors: factors,
        assessments: assessments,
        insights: healthInsights,
        timeRange: timeRange,
        userEmail: user?.email
      }, user?.email);

      toast.success('Comprehensive health report generated!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'emergency': case 'high': return 'destructive';
      case 'urgent': case 'medium': return 'secondary';
      case 'routine': case 'low': return 'default';
      default: return 'outline';
    }
  };

  const getTriageIcon = (level: string) => {
    switch (level) {
      case 'emergency': case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'urgent': case 'medium': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Enhanced chart data preparation
  const filteredSymptoms = selectedSymptom === 'all' ? symptoms : symptoms.filter(s => s.symptom_name === selectedSymptom);
  
  const symptomChartData = filteredSymptoms.reduce((acc, symptom) => {
    const date = format(parseISO(symptom.logged_at), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.symptoms = existing.symptoms || [];
      existing.symptoms.push({ name: symptom.symptom_name, severity: symptom.severity });
      existing.avgSeverity = existing.symptoms.reduce((sum: number, s: any) => sum + s.severity, 0) / existing.symptoms.length;
      existing.maxSeverity = Math.max(existing.maxSeverity || 0, symptom.severity);
    } else {
      acc.push({
        date,
        symptoms: [{ name: symptom.symptom_name, severity: symptom.severity }],
        avgSeverity: symptom.severity,
        maxSeverity: symptom.severity,
        [symptom.symptom_name]: symptom.severity
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
          {/* Enhanced Header with Export Options */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">Health Analytics</h2>
              <p className="text-muted-foreground">Track your health journey with detailed insights</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportHealthData} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              <Button onClick={generateComprehensivePDF} className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary/20" onClick={() => navigate('/premium')}>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-3 rounded-full bg-blue-100 w-fit mx-auto">
                      <Brain className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">AI Coaches</h3>
                      <p className="text-sm text-muted-foreground">Health & Mental Health AI Support</p>
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
              {/* Filter Controls */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>
                    <Select value={selectedSymptom} onValueChange={setSelectedSymptom}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select symptom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Symptoms</SelectItem>
                        {Array.from(new Set(symptoms.map(s => s.symptom_name))).map(symptom => (
                          <SelectItem key={symptom} value={symptom}>{symptom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="text-xs">
                      {filteredSymptoms.length} data points
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Symptom Trends Chart */}
              {filteredSymptoms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Symptom Severity Trends
                    </CardTitle>
                    <CardDescription>
                      Track how your symptoms change over time - {selectedSymptom === 'all' ? 'all symptoms' : selectedSymptom}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={symptomChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          domain={[0, 5]} 
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avgSeverity" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          strokeWidth={2}
                          name="Average Severity"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="maxSeverity" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Peak Severity"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Symptom Frequency & Distribution */}
              {symptoms.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Symptom Frequency
                      </CardTitle>
                      <CardDescription>How often you experience different symptoms</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={symptomFrequencyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            fontSize={10}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Severity Distribution
                      </CardTitle>
                      <CardDescription>Average severity by symptom type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={symptomFrequencyData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="avgSeverity"
                            label={({name, value}) => `${name}: ${value.toFixed(1)}`}
                          >
                            {symptomFrequencyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${200 + index * 40}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Factors Correlation */}
              {factors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Lifestyle Factors
                    </CardTitle>
                    <CardDescription>Track how lifestyle factors relate to your symptoms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.from(new Set(factors.map(f => f.factor_name))).map(factorName => {
                        const factorData = factors.filter(f => f.factor_name === factorName);
                        const recentEntries = factorData.slice(-5);
                        return (
                          <div key={factorName} className="p-3 bg-secondary/30 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{factorName}</span>
                              <div className="flex gap-2">
                                {recentEntries.map((entry, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {entry.factor_value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {factorData.length} entries over {timeRange} days
                            </p>
                          </div>
                        );
                      })}
                    </div>
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
                    <p className="text-muted-foreground mb-4">Start tracking symptoms to see detailed analytics and trends</p>
                    <Button onClick={() => navigate('/track-symptoms')}>
                      Start Tracking
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* New Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {healthInsights && Object.keys(healthInsights.trends).length > 0 ? (
                <>
                  {/* Health Trends Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        AI Health Insights
                      </CardTitle>
                      <CardDescription>
                        Personalized insights based on your health data trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(healthInsights.trends).map(([symptom, trend]: [string, any]) => (
                        <div key={symptom} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{symptom}</h4>
                            <Badge 
                              variant={trend.direction === 'improving' ? 'default' : 
                                     trend.direction === 'worsening' ? 'destructive' : 'secondary'}
                            >
                              {trend.direction}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Recent average: {trend.recentAverage}/5 severity
                            {trend.direction === 'improving' && ' - Keep up the good work!'}
                            {trend.direction === 'worsening' && ' - Consider tracking triggers'}
                            {trend.direction === 'stable' && ' - Maintaining steady levels'}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  {(healthInsights.recommendations.length > 0 || healthInsights.improvements.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {healthInsights.recommendations.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-orange-600">⚠️ Areas for Attention</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {healthInsights.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {healthInsights.improvements.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-green-600">✅ Positive Progress</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {healthInsights.improvements.map((imp: string, idx: number) => (
                                <li key={idx} className="text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                  {imp}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="p-4 rounded-full bg-secondary/30 w-fit mx-auto mb-4">
                      <Brain className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Not enough data for insights</h3>
                    <p className="text-muted-foreground mb-4">
                      Track symptoms for at least a week to generate personalized health insights
                    </p>
                    <Button onClick={() => navigate('/track-symptoms')}>
                      Start Tracking Symptoms
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

            <TabsContent value="subscription" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>Choose the plan that works best for your health needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <PricingSection />
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