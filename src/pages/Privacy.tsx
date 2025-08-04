import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
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
            <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
          </div>

          <Card className="shadow-lg border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-blue-800 dark:text-blue-200">Your Privacy Matters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-blue-800 dark:text-blue-200">
                MDSDR.com is committed to protecting your privacy and maintaining the confidentiality of your personal health information.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h4 className="font-semibold">Personal Information</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Email address and account information</li>
                  <li>Profile information (age, sex) when provided</li>
                  <li>Symptom descriptions and assessment responses</li>
                  <li>Usage data and preferences</li>
                </ul>
                
                <h4 className="font-semibold">Technical Information</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage patterns and analytics data</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Provide symptom assessment services</li>
                  <li>Maintain and improve our platform</li>
                  <li>Generate health reports and recommendations</li>
                  <li>Ensure platform security and prevent abuse</li>
                  <li>Communicate with you about your account</li>
                  <li>Comply with legal requirements</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>HIPAA Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  MDSDR.com is designed with HIPAA compliance principles in mind. We implement administrative, 
                  physical, and technical safeguards to protect your health information:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>End-to-end encryption of sensitive data</li>
                  <li>Access controls and authentication</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Staff training on privacy requirements</li>
                  <li>Secure data storage and transmission</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Sharing and Disclosure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>We do not sell, trade, or rent your personal health information. We may share information only in these limited circumstances:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect the safety of users or the public</li>
                  <li>With service providers under strict confidentiality agreements</li>
                  <li>In anonymized form for research purposes (with consent)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rights and Choices</CardTitle>
              </CardHeader>
              <CardContent>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                  <li>Opt-out of certain communications</li>
                  <li>File complaints about privacy practices</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  We retain your information only as long as necessary to provide our services and comply with 
                  legal requirements. Assessment data is stored securely and may be retained for medical research 
                  purposes (in anonymized form) with your consent.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Measures</CardTitle>
              </CardHeader>
              <CardContent>
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>AES-256 encryption for data storage</li>
                  <li>Multi-factor authentication</li>
                  <li>Regular security assessments</li>
                  <li>Incident response procedures</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  If you have questions about this privacy policy or our privacy practices, please contact us:
                </p>
                <div className="mt-2 space-y-1">
                  <p>Email: privacy@mdsdr.com</p>
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

export default Privacy;