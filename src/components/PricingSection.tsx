import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PricingSectionProps {
  currentPlan?: string;
  className?: string;
}

export default function PricingSection({ currentPlan, className }: PricingSectionProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Check subscription status
  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      setSubscribed(data?.subscribed || false);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Check subscription on mount
  useEffect(() => {
    checkSubscription();
  }, [user]);

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upgrade your plan.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open customer portal in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`grid md:grid-cols-2 gap-6 ${className}`}>
      {/* Free Plan */}
      <Card className={`relative ${currentPlan === 'free' ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Free Plan</CardTitle>
            {currentPlan === 'free' && (
              <Badge variant="secondary">Current Plan</Badge>
            )}
          </div>
          <CardDescription>
            <span className="text-3xl font-bold">$0</span>
            <span className="text-muted-foreground">/month</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>3 symptom checks per month</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Basic health reports</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Community support</span>
            </li>
          </ul>
          {currentPlan === 'free' && (
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Premium Plan */}
      <Card className={`relative ${subscribed ? 'ring-2 ring-primary border-primary' : 'border-primary'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Premium Plan
            </CardTitle>
            {subscribed && (
              <Badge className="bg-primary">Current Plan</Badge>
            )}
          </div>
          <CardDescription>
            <span className="text-3xl font-bold text-primary">$9.99</span>
            <span className="text-muted-foreground">/month</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">Unlimited symptom checks</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">AI Health Coach</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="font-medium">AI Mental Health Coach</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Detailed PDF health reports</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Symptom tracking & trends</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Priority support</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Family member profiles</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Export data to doctor</span>
            </li>
          </ul>
          
          {subscribed ? (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleManageSubscription}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Subscription
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade to Premium
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}