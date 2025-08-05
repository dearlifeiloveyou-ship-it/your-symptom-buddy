import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PhotoAssessmentProps {
  onAnalysisComplete?: (analysis: any) => void;
  className?: string;
}

interface AnalysisResult {
  analysis: string;
  possibleConditions: Array<{
    name: string;
    likelihood: number;
    description: string;
    recommendation: string;
  }>;
  urgencyLevel: 'low' | 'medium' | 'high';
  recommendations: string;
  confidenceScore: number;
  limitations: string;
}

export default function PhotoAssessment({ onAnalysisComplete, className = "" }: PhotoAssessmentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 10MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use photo assessment",
        variant: "destructive"
      });
      return;
    }

    if (!selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('photo-assessment', {
        body: {
          photoUrl: selectedImage,
          description: description.trim()
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }

      toast({
        title: "Analysis Complete",
        description: "Photo has been analyzed successfully",
      });

    } catch (error) {
      console.error('Photo analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          color: 'destructive',
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          title: 'High Urgency',
          message: 'Seek medical attention promptly'
        };
      case 'medium':
        return {
          color: 'secondary',
          icon: Clock,
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          textColor: 'text-orange-700 dark:text-orange-300',
          title: 'Medium Urgency',
          message: 'Consider consulting a healthcare provider'
        };
      default:
        return {
          color: 'default',
          icon: CheckCircle,
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300',
          title: 'Low Urgency',
          message: 'Monitor and consider self-care'
        };
    }
  };

  const urgencyConfig = analysis ? getUrgencyConfig(analysis.urgencyLevel) : null;
  const UrgencyIcon = urgencyConfig?.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Photo Health Assessment
        </CardTitle>
        <CardDescription>
          Upload a photo of a health concern for AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Image Upload Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 text-center">
            {selectedImage ? (
              <div className="space-y-3 sm:space-y-4">
                <img 
                  src={selectedImage} 
                  alt="Selected for analysis" 
                  className="max-w-full max-h-48 sm:max-h-64 mx-auto rounded-lg object-contain"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  Choose Different Image
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <Camera className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload a health-related photo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG up to 10MB
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  Select Image
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Additional Description (Optional)
          </label>
          <Textarea
            placeholder="Describe any symptoms, concerns, or context about the photo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] text-base" // Prevent zoom on iOS
            maxLength={500}
          />
          <div className="text-right text-xs text-muted-foreground">
            {description.length}/500
          </div>
        </div>

        {/* Analyze Button */}
        <Button 
          onClick={handleAnalyze}
          disabled={!selectedImage || isAnalyzing}
          className="w-full min-h-[48px]" // Better touch target
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Photo...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Analyze Photo
            </>
          )}
        </Button>

        {/* Analysis Results */}
        {analysis && urgencyConfig && UrgencyIcon && (
          <div className="space-y-4 border-t pt-6">
            <div className={`p-4 rounded-lg ${urgencyConfig.bgColor}`}>
              <div className="flex items-center gap-3 mb-2">
                <UrgencyIcon className={`w-5 h-5 ${urgencyConfig.textColor}`} />
                <span className={`font-medium ${urgencyConfig.textColor}`}>
                  {urgencyConfig.title}
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(analysis.confidenceScore * 100)}% confidence
                </Badge>
              </div>
              <p className="text-sm">{urgencyConfig.message}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Analysis</h4>
              <p className="text-sm text-muted-foreground">{analysis.analysis}</p>
            </div>

            {analysis.possibleConditions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Possible Conditions</h4>
                <div className="space-y-3">
                  {analysis.possibleConditions.map((condition, index) => (
                    <div key={index} className="p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-sm">{condition.name}</h5>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(condition.likelihood * 100)}% likelihood
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {condition.description}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {condition.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Recommendations</h4>
              <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Important Limitations
              </h5>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {analysis.limitations}
              </p>
            </div>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-medium">Medical Disclaimer</p>
              <p className="text-muted-foreground">
                This AI analysis is for informational purposes only and does not replace professional medical advice. 
                Always consult healthcare professionals for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}