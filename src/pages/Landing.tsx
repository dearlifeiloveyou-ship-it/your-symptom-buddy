import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Heart, Clock, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PricingSection from '@/components/PricingSection';
import SEO from '@/components/SEO';


export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": "MDSDR.com - AI-Powered Health Symptom Checker",
    "description": "AI-powered symptom checker and health assessment platform providing medical triage guidance and personalized health coaching.",
    "url": "https://mdsdr.com",
    "mainEntity": {
      "@type": "WebApplication",
      "name": "MDSDR Symptom Checker",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web Browser",
      "featureList": [
        "AI-powered symptom analysis",
        "Medical triage guidance", 
        "Health coaching",
        "Mental health support",
        "Symptom tracking",
        "Health reports"
      ],
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Plan",
          "price": "0",
          "priceCurrency": "USD",
          "description": "3 symptom checks per month, basic reports"
        },
        {
          "@type": "Offer", 
          "name": "Premium Plan",
          "price": "9.99",
          "priceCurrency": "USD",
          "description": "Unlimited checks, AI coaches, detailed reports"
        }
      ]
    },
    "about": {
      "@type": "MedicalCondition",
      "name": "Health Symptom Assessment",
      "description": "Comprehensive symptom analysis and medical triage guidance using AI technology"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MDSDR.com",
      "url": "https://mdsdr.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://mdsdr.com/logo.png"
      }
    },
    "specialty": [
      "General Medicine",
      "Symptom Assessment", 
      "Health Technology",
      "Medical Triage"
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="MDSDR.com - AI-Powered Health Symptom Checker & Medical Guidance"
        description="Get instant AI-powered health assessments with MDSDR.com. Check symptoms, receive medical triage guidance, and access personalized health coaching. Trusted by thousands for reliable health insights."
        keywords="symptom checker, health assessment, AI medical advice, health triage, symptom analysis, medical guidance, health coach, mental health support, medical symptoms, health diagnosis, online doctor, health app"
        url="https://mdsdr.com"
        schema={homePageSchema}
      />
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">MDSDR</h1>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About MDSDR
            </Link>
            <Link to="/symptom-library" className="text-muted-foreground hover:text-foreground transition-colors">
              Symptom Library
            </Link>
            <Link to="/premium" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Premium AI Coaches
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
            Trusted AI-Powered Health Guidance
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            MDSDR (pronounced "med-ster") provides evidence-based symptom assessments and personalized health insights—clear, supportive, and accessible.
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
            Why Choose MDSDR? 🌟
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Heart className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Engaging & Easy to Use</CardTitle>
              </CardHeader>
              <CardContent>
              <CardDescription>
                Clear flows and supportive language make it simple to describe symptoms and understand guidance—no gimmicks.
              </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Healthcare Professional Approved ✅</CardTitle>
              </CardHeader>
              <CardContent>
              <CardDescription>
                Built by healthcare professionals who understand that making health fun doesn't mean compromising on accuracy or safety.
              </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Always Available 🌟</CardTitle>
              </CardHeader>
              <CardContent>
              <CardDescription>
                Your health coach never sleeps! Get instant guidance anytime with our AI-powered platform that makes help available 24/7.
              </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Family Profiles</CardTitle>
              </CardHeader>
              <CardContent>
              <CardDescription>
                Create profiles for kids or family members and manage assessments securely in one place.
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
                <h4 className="text-xl font-semibold mb-2">Share Your Health Story</h4>
                <p className="text-muted-foreground">
                  Tell us what's happening with your health in your own words. Every story matters, and we're here to listen!
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Answer Guided Questions</h4>
                <p className="text-muted-foreground">
                  We ask clinically-informed questions to capture key details and context.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">🏆 Level Up Your Health</h4>
                <p className="text-muted-foreground">
                  Receive personalized guidance, unlock achievements, and track your wellness journey as you level up your health game!
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
            © 2024 MDSDR.com - Making health fun, one level at a time! 🎮
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