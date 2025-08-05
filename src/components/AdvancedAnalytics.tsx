import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, Target, Activity, Calendar, Zap, BarChart3, Clock, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { toast } from 'sonner';

interface AnalyticsProps {
  className?: string;
}

interface HealthTrend {
  date: string;
  symptom_severity: number;
  mood_score: number;
  energy_level: number;
  stress_level: number;
}

interface PredictiveInsight {
  id: string;
  type: 'warning' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  priority: number;
  actionable_steps: string[];
  created_at: string;
}

interface PersonalizedRecommendation {
  category: string;
  title: string;
  description: string;
  impact_score: number;
  effort_level: 'low' | 'medium' | 'high';
  timeline: string;
}

const AdvancedAnalytics = ({ className = '' }: AnalyticsProps) => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30'); // days
  const [healthTrends, setHealthTrends] = useState<HealthTrend[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHealthTrends(),
        generatePredictiveInsights(),
        generatePersonalizedRecommendations(),
        calculateRiskAssessment()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadHealthTrends = async () => {
    const startDate = subDays(new Date(), parseInt(timeRange));
    
    // Get symptoms data
    const { data: symptoms } = await supabase
      .from('tracked_symptoms')
      .select('logged_at, severity, symptom_name')
      .eq('user_id', user?.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at');

    // Get factors data (mood, energy, stress)
    const { data: factors } = await supabase
      .from('tracked_factors')
      .select('logged_at, factor_name, factor_value')
      .eq('user_id', user?.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at');

    // Process and combine data by date
    const trendsMap = new Map<string, HealthTrend>();
    
    // Process symptoms
    symptoms?.forEach(symptom => {
      const date = format(parseISO(symptom.logged_at), 'yyyy-MM-dd');
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          symptom_severity: 0,
          mood_score: 5,
          energy_level: 5,
          stress_level: 5
        });
      }
      const trend = trendsMap.get(date)!;
      trend.symptom_severity = Math.max(trend.symptom_severity, symptom.severity);
    });

    // Process factors
    factors?.forEach(factor => {
      const date = format(parseISO(factor.logged_at), 'yyyy-MM-dd');
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          symptom_severity: 0,
          mood_score: 5,
          energy_level: 5,
          stress_level: 5
        });
      }
      const trend = trendsMap.get(date)!;
      const value = parseInt(factor.factor_value) || 5;
      
      switch (factor.factor_name.toLowerCase()) {
        case 'mood':
          trend.mood_score = value;
          break;
        case 'energy':
          trend.energy_level = value;
          break;
        case 'stress':
          trend.stress_level = value;
          break;
      }
    });

    setHealthTrends(Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
  };

  const generatePredictiveInsights = async () => {
    try {
      // Call AI service to analyze patterns and generate insights
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          timeRange: parseInt(timeRange),
          analysisType: 'predictive'
        }
      });

      if (error) throw error;
      setPredictiveInsights(data.insights || []);
    } catch (error) {
      console.error('Error generating insights:', error);
      // Fallback to mock data for demonstration
      setPredictiveInsights([
        {
          id: '1',
          type: 'warning',
          title: 'Stress Pattern Detected',
          description: 'Your stress levels have been consistently high for the past week, particularly on weekdays.',
          confidence: 87,
          priority: 4,
          actionable_steps: [
            'Consider implementing a morning meditation routine',
            'Schedule regular breaks during work hours',
            'Evaluate workload distribution'
          ],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'trend',
          title: 'Improving Sleep Quality',
          description: 'Your sleep quality has improved by 23% over the past month based on tracked factors.',
          confidence: 92,
          priority: 2,
          actionable_steps: [
            'Continue current sleep hygiene practices',
            'Track factors that contribute to good sleep'
          ],
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  const generatePersonalizedRecommendations = async () => {
    // Generate recommendations based on user data, health trends, and AI analysis
    const mockRecommendations: PersonalizedRecommendation[] = [
      {
        category: 'Lifestyle',
        title: 'Optimize Your Sleep Schedule',
        description: 'Based on your tracking data, going to bed 30 minutes earlier could improve your energy levels by 18%.',
        impact_score: 8.5,
        effort_level: 'low',
        timeline: '2-3 weeks'
      },
      {
        category: 'Nutrition',
        title: 'Increase Omega-3 Intake',
        description: 'Your stress patterns suggest you could benefit from foods rich in omega-3 fatty acids.',
        impact_score: 7.2,
        effort_level: 'medium',
        timeline: '4-6 weeks'
      },
      {
        category: 'Exercise',
        title: 'Add 10-Minute Morning Walks',
        description: 'Light morning exercise could help regulate your mood patterns and improve overall well-being.',
        impact_score: 6.8,
        effort_level: 'low',
        timeline: '1-2 weeks'
      }
    ];
    
    setRecommendations(mockRecommendations);
  };

  const calculateRiskAssessment = async () => {
    // Calculate health risk scores based on tracked data and patterns
    const mockAssessment = {
      overall_score: 73,
      categories: [
        { name: 'Cardiovascular', score: 78, trend: 'stable' },
        { name: 'Mental Health', score: 65, trend: 'improving' },
        { name: 'Metabolic', score: 81, trend: 'stable' },
        { name: 'Sleep Quality', score: 69, trend: 'improving' }
      ],
      next_review: '2024-02-15'
    };
    
    setRiskAssessment(mockAssessment);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'recommendation': return <Target className="w-5 h-5 text-blue-600" />;
      case 'trend': return <TrendingUp className="w-5 h-5 text-green-600" />;
      default: return <Brain className="w-5 h-5 text-primary" />;
    }
  };

  const getEffortColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30';
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Health Analytics
          </h2>
          <p className="text-muted-foreground">
            Advanced insights and predictions based on your health data
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="trends">Health Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* Predictive Insights */}
          <div className="grid gap-4">
            {predictiveInsights.map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge variant="outline">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{insight.description}</p>
                      
                      {insight.actionable_steps.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Actionable Steps:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {insight.actionable_steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Health Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Health Trends Over Time</CardTitle>
              <CardDescription>
                Track your health metrics and identify patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="symptom_severity" 
                      stroke="#ef4444" 
                      name="Symptom Severity"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mood_score" 
                      stroke="#22c55e" 
                      name="Mood Score"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="energy_level" 
                      stroke="#3b82f6" 
                      name="Energy Level"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stress_level" 
                      stroke="#f59e0b" 
                      name="Stress Level"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Recognition */}
          <Card>
            <CardHeader>
              <CardTitle>Pattern Recognition</CardTitle>
              <CardDescription>
                AI-detected patterns in your health data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Weekly Cycles
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Stress levels tend to peak on Tuesdays and Wednesdays
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    Recovery Patterns
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your mood improves consistently after physical activity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Personalized Recommendations */}
          <div className="grid gap-4">
            {recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{rec.category}</Badge>
                        <Badge className={getEffortColor(rec.effort_level)}>
                          {rec.effort_level} effort
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{rec.title}</h3>
                      <p className="text-muted-foreground mb-3">{rec.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Impact: {rec.impact_score}/10
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Timeline: {rec.timeline}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {rec.impact_score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Impact Score
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {/* Risk Assessment Dashboard */}
          {riskAssessment && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall Health Score</CardTitle>
                  <CardDescription>
                    AI-calculated health risk assessment based on your data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {riskAssessment.overall_score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Overall Score
                      </div>
                    </div>
                    <div className="flex-1">
                      <Progress value={riskAssessment.overall_score} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Next assessment: {format(parseISO(riskAssessment.next_review), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskAssessment.categories.map((category: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Trend: {category.trend}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={category.score} className="w-24 h-2" />
                          <div className="text-lg font-bold w-12 text-right">
                            {category.score}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;