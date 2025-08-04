import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, FileText, Database, UserCheck, Award, Zap } from 'lucide-react';

export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" asChild>
            <Link to="/">← Back to Home</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Trust Framework</h1>
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
            Your Trust is Our Foundation
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            We've built MDSDR with the highest standards of security, privacy, and clinical rigor 
            to ensure you can trust us with your most sensitive health information.
          </p>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Our Trust Pillars
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Award className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Clinical Rigor</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Evidence-based medical algorithms developed with healthcare professionals 
                  and validated against clinical standards.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Lock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Radical Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  End-to-end encryption, minimal data collection, and you own and control 
                  all your health information.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Security First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  HIPAA compliance, SOC 2 Type II standards, and enterprise-grade 
                  security measures protect your data.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Eye className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Clear data policies, open about our methods, and transparent 
                  about limitations and capabilities.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Privacy & Security */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            How We Protect Your Data
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <Database className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Row-Level Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <CardDescription>
                    Every piece of your health data is protected with row-level security, 
                    ensuring only you can access your information.
                  </CardDescription>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Individual user data isolation</li>
                    <li>• Multi-layered access controls</li>
                    <li>• Real-time security monitoring</li>
                    <li>• Automated threat detection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Lock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>End-to-End Encryption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <CardDescription>
                    Your health data is encrypted both in transit and at rest using 
                    industry-standard AES-256 encryption.
                  </CardDescription>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• AES-256 encryption at rest</li>
                    <li>• TLS 1.3 for data in transit</li>
                    <li>• Zero-knowledge architecture</li>
                    <li>• Encrypted backups and storage</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* HIPAA Compliance */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">HIPAA Compliance & More</h3>
            <p className="text-lg text-muted-foreground">
              We meet and exceed healthcare industry standards for data protection.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <FileText className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">HIPAA Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Full compliance with Health Insurance Portability and Accountability Act 
                  requirements for protected health information.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">SOC 2 Type II</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Independently audited and certified for security, availability, 
                  processing integrity, confidentiality, and privacy.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <UserCheck className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">GDPR Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Designed with privacy by design principles and full compliance 
                  with European data protection regulations.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Control */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            You Control Your Data
          </h3>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Data Ownership</h4>
                <p className="text-muted-foreground">
                  You own all your health data. We're just the secure custodian. 
                  You can export, delete, or transfer your data at any time.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">No Data Sales</h4>
                <p className="text-muted-foreground">
                  We never sell your personal health information to third parties. 
                  Your data is not our product - your health outcomes are our priority.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2">Minimal Collection</h4>
                <p className="text-muted-foreground">
                  We only collect data that's necessary to provide you with accurate 
                  health guidance. No unnecessary tracking or profiling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Security */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Technical Security Measures
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">Infrastructure Security</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AWS enterprise-grade hosting</li>
                  <li>• Multi-region data redundancy</li>
                  <li>• DDoS protection</li>
                  <li>• 99.9% uptime guarantee</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">Access Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Multi-factor authentication</li>
                  <li>• Role-based permissions</li>
                  <li>• Session management</li>
                  <li>• API rate limiting</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Eye className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">Monitoring & Auditing</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 24/7 security monitoring</li>
                  <li>• Comprehensive audit logs</li>
                  <li>• Anomaly detection</li>
                  <li>• Regular penetration testing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Transparency Commitments */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Our Transparency Commitments
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Open About Our Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="space-y-2">
                  <p>We're transparent about how our AI works, the medical sources we use, 
                  and the limitations of our assessments.</p>
                  <p>Our symptom analysis is based on evidence-based medical literature 
                  and clinical guidelines from trusted sources like MedlinePlus and medical journals.</p>
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Clear Data Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="space-y-2">
                  <p>Our privacy policy is written in plain language. No legal jargon 
                  or hidden clauses - just clear explanations of how we handle your data.</p>
                  <p>We provide regular transparency reports about our security practices 
                  and any incidents that may occur.</p>
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
            Experience Trustworthy Healthcare Technology
          </h3>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Start your secure health assessment with confidence.
          </p>
          <div className="space-x-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/profile-selection">Start Secure Assessment</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/privacy">Read Privacy Policy</Link>
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
            <Link to="/about" className="hover:text-foreground transition-colors">
              About MDSDR
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}