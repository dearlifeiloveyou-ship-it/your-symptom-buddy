import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-primary">Terms of Service</h1>
          </div>

          <Card className="shadow-lg border-slate-200 bg-slate-50/50 dark:bg-slate-900/10 mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-slate-600" />
                <CardTitle className="text-slate-800 dark:text-slate-200">Agreement to Terms</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-800 dark:text-slate-200">
                By accessing and using MDSDR.com, you agree to be bound by these Terms of Service.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  These Terms of Service ("Terms") govern your use of the MDSDR.com website and services 
                  ("Service") operated by MDSDR.com ("us", "we", or "our"). By accessing or using our 
                  Service, you agree to be bound by these Terms. If you disagree with any part of these 
                  terms, then you may not access the Service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Description of Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  MDSDR.com provides an AI-powered symptom assessment platform designed to offer 
                  informational health guidance. Our service includes:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Symptom analysis and triage recommendations</li>
                  <li>Health tracking and monitoring tools</li>
                  <li>Educational health content</li>
                  <li>Assessment history and reporting</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  To access certain features of our Service, you may be required to create an account. 
                  You are responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Maintaining the confidentiality of your account information</li>
                  <li>Providing accurate and complete information</li>
                  <li>Updating your information when necessary</li>
                  <li>All activities that occur under your account</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prohibited Uses</CardTitle>
              </CardHeader>
              <CardContent>
                <p>You may not use our Service:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                  <li>To violate any international, federal, provincial, or state regulations or laws</li>
                  <li>To transmit malicious code, viruses, or harmful content</li>
                  <li>To impersonate another person or entity</li>
                  <li>To harvest or collect email addresses or other contact information</li>
                  <li>To spam, phish, or conduct other fraudulent activities</li>
                  <li>To interfere with or circumvent security features</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Disclaimer</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Our Service provides general health information for educational purposes only. It is not 
                  intended to be a substitute for professional medical advice, diagnosis, or treatment. 
                  Always seek the advice of qualified healthcare providers with any questions about medical 
                  conditions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intellectual Property Rights</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  The Service and its original content, features, and functionality are and will remain 
                  the exclusive property of MDSDR.com and its licensors. The Service is protected by 
                  copyright, trademark, and other laws.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Termination</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We may terminate or suspend your account and bar access to the Service immediately, 
                  without prior notice or liability, under our sole discretion, for any reason whatsoever 
                  including without limitation if you breach the Terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  In no event shall MDSDR.com, nor its directors, employees, partners, agents, suppliers, 
                  or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
                  damages, including without limitation, loss of profits, data, use, goodwill, or other 
                  intangible losses, resulting from your use of the Service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any 
                  time. If a revision is material, we will try to provide at least 30 days notice prior 
                  to any new terms taking effect.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="mt-2 space-y-1">
                  <p>Email: legal@mdsdr.com</p>
                  <p>Address: [Company Address]</p>
                  <p>Phone: [Contact Number]</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;