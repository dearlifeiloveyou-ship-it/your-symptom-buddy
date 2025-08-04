import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const Disclaimer = () => {
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
            <h1 className="text-3xl font-bold text-primary">Medical Disclaimer</h1>
          </div>

          <Card className="shadow-lg border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <CardTitle className="text-amber-800 dark:text-amber-200">Important Notice</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-amber-800 dark:text-amber-200">
                Please read this disclaimer carefully before using MDSDR.com's symptom assessment service.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Not Medical Advice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  The information provided by MDSDR.com is for informational and educational purposes only and 
                  should not be considered medical advice, diagnosis, or treatment recommendations. The symptom 
                  assessment tool is designed to provide general health information and guidance, but it cannot 
                  replace the expertise and judgment of qualified healthcare professionals.
                </p>
                <p>
                  Always seek the advice of your physician or other qualified healthcare provider with any 
                  questions you may have regarding a medical condition. Never disregard professional medical 
                  advice or delay in seeking it because of something you have read on this website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Situations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  If you are experiencing a medical emergency, call 911 (in the United States) or your local 
                  emergency number immediately. Do not use this website for emergency medical situations.
                </p>
                <p>
                  Examples of medical emergencies include but are not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Chest pain or difficulty breathing</li>
                  <li>Severe allergic reactions</li>
                  <li>Signs of stroke or heart attack</li>
                  <li>Severe bleeding or trauma</li>
                  <li>Loss of consciousness</li>
                  <li>Severe abdominal pain</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitations of AI Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Our AI-powered symptom assessment tool uses algorithms and medical databases to analyze 
                  symptoms and provide general guidance. However, these tools have limitations:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>They cannot perform physical examinations</li>
                  <li>They may not account for your complete medical history</li>
                  <li>They cannot order or interpret diagnostic tests</li>
                  <li>They may not recognize rare or complex conditions</li>
                  <li>They cannot provide personalized treatment plans</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>No Doctor-Patient Relationship</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Use of this website does not create a doctor-patient relationship between you and MDSDR.com, 
                  its owners, or any healthcare professionals associated with the service. The information 
                  provided should not be used for diagnosing or treating a health problem or disease.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy and Reliability</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  While we strive to provide accurate and up-to-date health information, we cannot guarantee 
                  the accuracy, completeness, or reliability of the content. Medical knowledge is constantly 
                  evolving, and information may become outdated. Always verify information with your healthcare 
                  provider.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  MDSDR.com and its affiliated parties shall not be liable for any damages, losses, or injuries 
                  arising from the use of this website or reliance on the information provided. This includes 
                  but is not limited to direct, indirect, incidental, punitive, and consequential damages.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>When to Seek Professional Care</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Please consult with a healthcare professional if:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your symptoms persist or worsen</li>
                  <li>You have concerns about your health</li>
                  <li>You need a medical diagnosis or treatment</li>
                  <li>You are taking medications or have chronic conditions</li>
                  <li>You are pregnant or breastfeeding</li>
                </ul>
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

export default Disclaimer;