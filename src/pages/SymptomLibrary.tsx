import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Heart, Brain, Thermometer, Search, Activity } from 'lucide-react';

interface SymptomEntry {
  name: string;
  description: string;
  possibleCauses: string[];
  warningSignsCategory: 'low' | 'medium' | 'high';
  warningSigns: string[];
  whenToSeekCare: string;
  selfCareOptions: string[];
}

const symptomCategories = {
  respiratory: {
    name: 'Respiratory',
    icon: Activity,
    symptoms: [
      {
        name: 'Cough',
        description: 'A reflex action to clear the breathing passages of irritants, mucus, fluids, and microbes.',
        possibleCauses: ['Common cold', 'Flu', 'Allergies', 'Bronchitis', 'Pneumonia', 'Asthma'],
        warningSignsCategory: 'medium' as const,
        warningSigns: ['Blood in cough', 'Persistent fever', 'Difficulty breathing', 'Chest pain'],
        whenToSeekCare: 'Seek immediate care if coughing blood, severe breathing difficulty, or high fever. See healthcare provider if cough persists beyond 3 weeks.',
        selfCareOptions: ['Stay hydrated', 'Use humidifier', 'Honey and warm water', 'Rest', 'Avoid irritants']
      },
      {
        name: 'Shortness of Breath',
        description: 'Feeling like you cannot get enough air or that breathing requires more effort than usual.',
        possibleCauses: ['Asthma', 'Heart conditions', 'Anxiety', 'Exercise', 'Pneumonia', 'Blood clot'],
        warningSignsCategory: 'high' as const,
        warningSigns: ['Severe difficulty breathing', 'Chest pain', 'Blue lips or fingernails', 'Fainting'],
        whenToSeekCare: 'Seek emergency care immediately for severe shortness of breath, especially with chest pain or blue discoloration.',
        selfCareOptions: ['Sit upright', 'Slow deep breathing', 'Stay calm', 'Use prescribed inhaler if available']
      }
    ]
  },
  cardiovascular: {
    name: 'Cardiovascular',
    icon: Heart,
    symptoms: [
      {
        name: 'Chest Pain',
        description: 'Discomfort or pain in the chest area that can range from sharp to dull, crushing to burning.',
        possibleCauses: ['Heart attack', 'Angina', 'Muscle strain', 'Acid reflux', 'Anxiety', 'Lung issues'],
        warningSignsCategory: 'high' as const,
        warningSigns: ['Crushing chest pain', 'Pain radiating to arm/jaw', 'Sweating', 'Nausea', 'Shortness of breath'],
        whenToSeekCare: 'Call emergency services immediately for chest pain, especially if accompanied by sweating, nausea, or arm pain.',
        selfCareOptions: ['For non-emergency: Rest', 'Avoid exertion', 'Take prescribed medications as directed']
      },
      {
        name: 'Heart Palpitations',
        description: 'The feeling that your heart is racing, pounding, or skipping beats.',
        possibleCauses: ['Anxiety', 'Caffeine', 'Exercise', 'Arrhythmia', 'Thyroid issues', 'Dehydration'],
        warningSignsCategory: 'medium' as const,
        warningSigns: ['Chest pain with palpitations', 'Fainting', 'Severe dizziness', 'Prolonged episodes'],
        whenToSeekCare: 'Seek immediate care if palpitations occur with chest pain, fainting, or severe dizziness.',
        selfCareOptions: ['Deep breathing', 'Reduce caffeine', 'Stay hydrated', 'Practice relaxation techniques']
      }
    ]
  },
  gastrointestinal: {
    name: 'Gastrointestinal',
    icon: Thermometer,
    symptoms: [
      {
        name: 'Nausea and Vomiting',
        description: 'Feeling sick to your stomach, often accompanied by the urge or act of vomiting.',
        possibleCauses: ['Food poisoning', 'Viral gastroenteritis', 'Motion sickness', 'Pregnancy', 'Medications'],
        warningSignsCategory: 'medium' as const,
        warningSigns: ['Severe dehydration', 'Blood in vomit', 'Severe abdominal pain', 'High fever'],
        whenToSeekCare: 'Seek care if unable to keep fluids down for 24 hours, signs of dehydration, or blood in vomit.',
        selfCareOptions: ['Small sips of clear fluids', 'BRAT diet', 'Ginger tea', 'Rest', 'Avoid solid foods initially']
      },
      {
        name: 'Abdominal Pain',
        description: 'Pain or discomfort in the stomach area that can be cramping, sharp, dull, or burning.',
        possibleCauses: ['Indigestion', 'Gas', 'Gastroenteritis', 'Appendicitis', 'Gallstones', 'Ulcers'],
        warningSignsCategory: 'high' as const,
        warningSigns: ['Severe, sudden pain', 'Fever with pain', 'Vomiting', 'Rigid abdomen', 'Pain in right lower quadrant'],
        whenToSeekCare: 'Seek emergency care for severe, sudden abdominal pain, especially with fever or vomiting.',
        selfCareOptions: ['Heat pad for mild pain', 'Stay hydrated', 'Avoid solid foods', 'Rest', 'Over-the-counter antacids for mild cases']
      }
    ]
  },
  neurological: {
    name: 'Neurological',
    icon: Brain,
    symptoms: [
      {
        name: 'Headache',
        description: 'Pain in the head or upper neck, ranging from mild to severe.',
        possibleCauses: ['Tension', 'Migraine', 'Dehydration', 'Sinus issues', 'High blood pressure', 'Serious conditions'],
        warningSignsCategory: 'medium' as const,
        warningSigns: ['Sudden severe headache', 'Headache with fever and neck stiffness', 'Vision changes', 'Confusion'],
        whenToSeekCare: 'Seek immediate care for sudden, severe headache or headache with fever, neck stiffness, or vision changes.',
        selfCareOptions: ['Rest in dark, quiet room', 'Apply cold compress', 'Stay hydrated', 'Over-the-counter pain relievers', 'Manage stress']
      },
      {
        name: 'Dizziness',
        description: 'Feeling lightheaded, unsteady, or having a spinning sensation (vertigo).',
        possibleCauses: ['Inner ear problems', 'Low blood pressure', 'Dehydration', 'Medications', 'Anxiety'],
        warningSignsCategory: 'low' as const,
        warningSigns: ['Dizziness with chest pain', 'Fainting', 'Severe headache', 'Difficulty speaking'],
        whenToSeekCare: 'Seek care if dizziness is severe, persistent, or accompanied by chest pain or neurological symptoms.',
        selfCareOptions: ['Sit or lie down slowly', 'Stay hydrated', 'Avoid sudden movements', 'Ginger tea']
      }
    ]
  }
};

export default function SymptomLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('respiratory');

  const filteredSymptoms = symptomCategories[selectedCategory as keyof typeof symptomCategories].symptoms.filter(
    symptom => symptom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               symptom.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (category: 'low' | 'medium' | 'high') => {
    switch (category) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getSeverityIcon = (category: 'low' | 'medium' | 'high') => {
    switch (category) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" asChild>
            <Link to="/">← Back to Home</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Symptom Library</h1>
          <div className="space-x-4">
            <Button asChild>
              <Link to="/profile-selection">Start Assessment</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Medical Knowledge Library
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Explore our comprehensive database of common symptoms, their possible causes, 
            and guidance on when to seek medical care.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-6 px-4 bg-amber-50 border-l-4 border-amber-400">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Medical Disclaimer</h3>
              <p className="text-sm text-amber-700">
                This information is for educational purposes only and is not intended to diagnose, 
                treat, cure, or prevent any disease. Always consult with a qualified healthcare 
                provider for proper medical evaluation and treatment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(symptomCategories).map(([key, category]) => {
                const IconComponent = category.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    {category.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(symptomCategories).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-8">
                <div className="grid gap-6">
                  {filteredSymptoms.map((symptom, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{symptom.name}</CardTitle>
                            <CardDescription className="mt-2">
                              {symptom.description}
                            </CardDescription>
                          </div>
                          <Badge variant={getSeverityColor(symptom.warningSignsCategory)} className="ml-4">
                            {getSeverityIcon(symptom.warningSignsCategory)}
                            <span className="ml-1 capitalize">{symptom.warningSignsCategory} Priority</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-2">Possible Causes</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptom.possibleCauses.map((cause, i) => (
                              <Badge key={i} variant="outline">{cause}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-red-700">Warning Signs</h4>
                          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            {symptom.warningSigns.map((sign, i) => (
                              <li key={i}>{sign}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-blue-700">When to Seek Care</h4>
                          <p className="text-sm text-muted-foreground">{symptom.whenToSeekCare}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-green-700">Self-Care Options</h4>
                          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            {symptom.selfCareOptions.map((option, i) => (
                              <li key={i}>{option}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-2xl font-bold mb-4">
            Need Personalized Health Guidance?
          </h3>
          <p className="text-muted-foreground mb-6">
            Use our AI-powered symptom checker for personalized recommendations based on your specific situation.
          </p>
          <Button size="lg" asChild>
            <Link to="/profile-selection">Start Your Assessment</Link>
          </Button>
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