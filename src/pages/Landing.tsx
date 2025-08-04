import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Heart, Clock, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PricingSection from '@/components/PricingSection';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">MDSDR.com</h1>
          <div className="space-x-4">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            Your Trusted Health Companion
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            Get clear, empathetic health guidance with our AI-powered symptom checker. 
            Bridge the gap between acute care and chronic condition management.
          </p>
          <div className="space-x-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/profile-selection')}
            >
              Check My Symptoms
            </Button>
            {user ? (
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why Choose MDSDR?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Heart className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Empathetic Care</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Designed to reduce anxiety and provide clear, compassionate health guidance
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Trusted & Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  HIPAA-compliant platform with encrypted data and privacy-first design
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>24/7 Available</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get immediate health insights anytime, anywhere with our AI-powered system
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Family Focused</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage health assessments for yourself, your children, and family members
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h3>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Describe Your Symptoms</h4>
                <p className="text-muted-foreground">
                  Tell us about your health concerns in your own words. Our AI understands natural language.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Answer Follow-up Questions</h4>
                <p className="text-muted-foreground">
                  Our system asks relevant questions to better understand your situation.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Get Clear Guidance</h4>
                <p className="text-muted-foreground">
                  Receive color-coded triage recommendations and next steps for your care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center mb-4">
            Choose Your Plan
          </h3>
          <p className="text-center text-muted-foreground mb-12">
            Get started for free or unlock premium features
          </p>
          <PricingSection />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="mb-4">
            © 2024 MDSDR.com - Your trusted health companion
          </p>
          <div className="space-x-4">
            <Link to="/disclaimer" className="hover:text-foreground transition-colors">
              Medical Disclaimer
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}