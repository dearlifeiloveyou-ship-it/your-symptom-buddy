import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Brain, Star, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AICoachChat from '@/components/AICoachChat';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

const PremiumFeatures = () => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCoach, setActiveCoach] = useState<'health' | 'mental_health' | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to check subscription status');
    } finally {
      setIsLoading(false);
    }
  };

  const startCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
    }
  };

  const openCustomerPortal = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open customer portal');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (activeCoach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <AICoachChat 
          coachType={activeCoach} 
          onClose={() => setActiveCoach(null)} 
        />
      </div>
    );
  }

  const isPremium = subscriptionData?.subscribed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-8 h-8 text-yellow-500" />
              <h1 className="text-4xl font-bold">Premium Features</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Unlock advanced AI coaching and personalized health guidance
            </p>
          </div>

          {/* Subscription Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPremium ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Premium Active
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-orange-600" />
                    Premium Required
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isPremium ? (
                  <>
                    You have access to all premium features including AI coaches.
                    {subscriptionData?.subscription_end && (
                      <> Subscription ends: {new Date(subscriptionData.subscription_end).toLocaleDateString()}</>
                    )}
                  </>
                ) : (
                  'Upgrade to premium to access AI health and mental health coaches.'
                )}
              </CardDescription>
            </CardHeader>
            {isPremium ? (
              <CardContent>
                <Button onClick={openCustomerPortal} variant="outline">
                  Manage Subscription
                </Button>
              </CardContent>
            ) : (
            <CardContent>
              <Button onClick={startCheckout} className="mr-4">
                Upgrade to Premium - $9.99/month
              </Button>
              <Button onClick={checkSubscriptionStatus} variant="outline">
                Refresh Status
              </Button>
            </CardContent>
            )}
          </Card>

          {/* AI Coaches */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Health Coach */}
            <Card className={`${!isPremium ? 'opacity-75' : ''} hover:shadow-lg transition-shadow`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Heart className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      AI Health Coach
                      <Badge variant="secondary">Premium</Badge>
                    </CardTitle>
                    <CardDescription>
                      Personal wellness and preventive health guidance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Personalized nutrition and exercise advice</li>
                  <li>• Preventive health recommendations</li>
                  <li>• Lifestyle optimization strategies</li>
                  <li>• Health goal tracking support</li>
                  <li>• Analysis of your health patterns</li>
                </ul>
                <Button 
                  onClick={() => setActiveCoach('health')}
                  disabled={!isPremium}
                  className="w-full"
                >
                  {!isPremium && <Lock className="w-4 h-4 mr-2" />}
                  {isPremium ? 'Start Health Coaching' : 'Requires Premium'}
                </Button>
              </CardContent>
            </Card>

            {/* Mental Health Coach */}
            <Card className={`${!isPremium ? 'opacity-75' : ''} hover:shadow-lg transition-shadow`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      AI Mental Health Coach
                      <Badge variant="secondary">Premium</Badge>
                    </CardTitle>
                    <CardDescription>
                      Supportive guidance for emotional well-being
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Stress and anxiety management techniques</li>
                  <li>• Mindfulness and relaxation exercises</li>
                  <li>• Cognitive behavioral therapy insights</li>
                  <li>• Mood tracking and pattern analysis</li>
                  <li>• 24/7 emotional support availability</li>
                </ul>
                <Button 
                  onClick={() => setActiveCoach('mental_health')}
                  disabled={!isPremium}
                  className="w-full"
                >
                  {!isPremium && <Lock className="w-4 h-4 mr-2" />}
                  {isPremium ? 'Start Mental Health Coaching' : 'Requires Premium'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Premium Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Why Choose Premium?</CardTitle>
              <CardDescription>
                Get the most advanced health and wellness support available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">AI-Powered Intelligence</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced GPT-4.1 model provides sophisticated, contextual responses
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Personalized Care</h3>
                  <p className="text-sm text-muted-foreground">
                    Tailored advice based on your health history and assessments
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Evidence-Based</h3>
                  <p className="text-sm text-muted-foreground">
                    Recommendations grounded in medical research and best practices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>
              AI coaches provide supportive guidance and are not a replacement for professional medical or mental health care. 
              Always consult with qualified healthcare providers for medical advice and treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatures;