import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Shield, Target, Users, Brain, TrendingUp } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" asChild>
            <Link to="/">← Back to Home</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">About MedSter 🎮</h1>
          <div className="space-x-4">
            <Button asChild>
              <Link to="/profile-selection">Start Assessment</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Where Healthcare Meets Fun! 🎉
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            At MedSter, we believe health should be engaging, not scary. Founded in 2024 by a passionate group of healthcare professionals, 
            we're revolutionizing wellness by making it fun, gamified, and accessible to everyone. Because taking care of yourself should feel like leveling up!
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Our Mission 🎯</h3>
              <p className="text-lg text-muted-foreground mb-6">
                To transform healthcare from scary and confusing into fun and engaging! We're creating 
                the world's first gamified health platform where taking care of yourself feels like 
                playing your favorite game - complete with achievements, rewards, and level-ups.
              </p>
              <p className="text-lg text-muted-foreground">
                Founded by healthcare professionals who got tired of seeing patients stressed about their health, 
                we decided to change the game. Literally. Because when health is fun, people actually take better care of themselves!
              </p>
            </div>
            <Card>
              <CardHeader>
                <Target className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Our Vision 🌟</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  A world where health is the most engaging game you'll ever play! Where checking your symptoms 
                  feels like unlocking achievements, where tracking your wellness earns you badges, and where 
                  taking care of yourself becomes the most rewarding adventure of your life.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            How We're Different
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Heart className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Empathetic & User-Allied</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Unlike traditional symptom checkers that can increase anxiety, 
                  our AI uses empathetic language and positions itself as your 
                  health ally, not just a diagnostic tool.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Brain className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Comprehensive Health Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We combine symptom assessment with health tracking, pattern 
                  recognition, and personalized insights to provide holistic 
                  health guidance.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Long-term Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Through continuous tracking and data-driven insights, we help 
                  you understand patterns and trends in your health over time.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Our Approach to Healthcare
          </h3>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Listen & Understand</h4>
                <p className="text-muted-foreground">
                  We use natural language processing to understand your symptoms 
                  in your own words, without medical jargon barriers.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Analyze & Guide</h4>
                <p className="text-muted-foreground">
                  Our AI combines medical knowledge with your personal health 
                  data to provide personalized guidance and next steps.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Track & Support</h4>
                <p className="text-muted-foreground">
                  We help you monitor your health journey over time, identifying 
                  patterns and providing ongoing support for better outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose MDSDR */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why Choose MDSDR as Your Health Companion?
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Clinical Rigor Meets Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our platform combines evidence-based medical knowledge with 
                  accessible, user-friendly technology to democratize healthcare guidance.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Family-Centered Care</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage health assessments for yourself, children, and family 
                  members from one secure platform designed with families in mind.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-3xl font-bold mb-6">
            Ready to Start Your Health Journey?
          </h3>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Join thousands of users who trust MDSDR as their health companion.
          </p>
          <div className="space-x-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/profile-selection">Start Free Assessment</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/symptom-library">Explore Symptom Library</Link>
            </Button>
          </div>
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
            <Link to="/trust" className="hover:text-foreground transition-colors">
              Trust Framework
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}