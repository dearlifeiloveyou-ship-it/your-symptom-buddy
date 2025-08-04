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
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/symptom-library" className="text-muted-foreground hover:text-foreground transition-colors">
              Symptom Library
            </Link>
            <Link to="/trust" className="text-muted-foreground hover:text-foreground transition-colors">
              Trust & Security
            </Link>
          </nav>

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
            Your Partner in Health and Wellbeing
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            We're here to support you through every health concern with empathetic, AI-powered guidance. 
            Because your health journey deserves a companion who truly understands and cares about your wellbeing.
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
                Your health journey shouldn't feel overwhelming. We provide clear, compassionate guidance that puts your mind at ease.
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
                Your trust is sacred to us. Enterprise-grade security, HIPAA compliance, and radical data privacy protect what matters most.
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
                Health concerns don't wait for office hours. We're here whenever you need guidance, day or night.
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
                Because health is a family matter. Support the wellbeing of everyone you care about from one trusted platform.
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
                  Share what's on your mind about your health. We listen without judgment and understand your concerns in your own words.
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
                  We'll gently guide you through questions that help us understand your unique situation and provide better support.
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
                  Get clear, actionable guidance tailored to your situation, with gentle direction on the best next steps for your wellbeing.
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
            <Link to="/about" className="hover:text-foreground transition-colors">
              About MDSDR
            </Link>
            <Link to="/symptom-library" className="hover:text-foreground transition-colors">
              Symptom Library
            </Link>
            <Link to="/trust" className="hover:text-foreground transition-colors">
              Trust Framework
            </Link>
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