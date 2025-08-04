import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, TrendingUp, Save, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SymptomEntry {
  symptom: string;
  severity: number;
  notes: string;
}

interface FactorEntry {
  factor: string;
  value: string;
  notes: string;
}

const TrackSymptoms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([
    { symptom: '', severity: 1, notes: '' }
  ]);
  const [factors, setFactors] = useState<FactorEntry[]>([
    { factor: '', value: '', notes: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  const addSymptom = () => {
    setSymptoms([...symptoms, { symptom: '', severity: 1, notes: '' }]);
  };

  const updateSymptom = (index: number, field: keyof SymptomEntry, value: any) => {
    const updated = [...symptoms];
    updated[index] = { ...updated[index], [field]: value };
    setSymptoms(updated);
  };

  const removeSymptom = (index: number) => {
    if (symptoms.length > 1) {
      setSymptoms(symptoms.filter((_, i) => i !== index));
    }
  };

  const addFactor = () => {
    setFactors([...factors, { factor: '', value: '', notes: '' }]);
  };

  const updateFactor = (index: number, field: keyof FactorEntry, value: any) => {
    const updated = [...factors];
    updated[index] = { ...updated[index], [field]: value };
    setFactors(updated);
  };

  const removeFactor = (index: number) => {
    if (factors.length > 1) {
      setFactors(factors.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const validSymptoms = symptoms.filter(s => s.symptom.trim());
    const validFactors = factors.filter(f => f.factor.trim() && f.value.trim());

    if (validSymptoms.length === 0) {
      toast.error('Please add at least one symptom');
      return;
    }

    setIsSaving(true);
    try {
      // Save symptoms
      const symptomPromises = validSymptoms.map(symptom =>
        supabase
          .from('tracked_symptoms')
          .insert({
            user_id: user.id,
            symptom_name: symptom.symptom,
            severity: symptom.severity,
            notes: symptom.notes || null,
            logged_at: selectedDate.toISOString()
          })
      );

      // Save factors
      const factorPromises = validFactors.map(factor =>
        supabase
          .from('tracked_factors')
          .insert({
            user_id: user.id,
            factor_name: factor.factor,
            factor_value: factor.value,
            notes: factor.notes || null,
            logged_at: selectedDate.toISOString()
          })
      );

      await Promise.all([...symptomPromises, ...factorPromises]);

      toast.success('Symptoms and factors saved successfully!');
      
      // Reset form
      setSymptoms([{ symptom: '', severity: 1, notes: '' }]);
      setFactors([{ factor: '', value: '', notes: '' }]);
      setSelectedDate(new Date());
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Track Symptoms</h1>
                <p className="text-sm text-muted-foreground">Log your daily symptoms and factors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Select Date</CardTitle>
              <CardDescription>Choose the date for this symptom entry</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Symptoms */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary">Symptoms</CardTitle>
                  <CardDescription>Rate your symptoms on a scale of 1-5</CardDescription>
                </div>
                <Button onClick={addSymptom} size="sm" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Symptom
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {symptoms.map((symptom, index) => (
                <div key={index} className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Symptom {index + 1}</Label>
                    {symptoms.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeSymptom(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`symptom-${index}`}>Symptom name</Label>
                      <Input
                        id={`symptom-${index}`}
                        placeholder="e.g. Headache, Nausea, Fatigue"
                        value={symptom.symptom}
                        onChange={(e) => updateSymptom(index, 'symptom', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Severity: {symptom.severity}</Label>
                      <div className="px-3 py-2">
                        <Slider
                          value={[symptom.severity]}
                          onValueChange={(value) => updateSymptom(index, 'severity', value[0])}
                          max={5}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1 (Mild)</span>
                          <span>5 (Severe)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`notes-${index}`}>Notes (optional)</Label>
                      <Textarea
                        id={`notes-${index}`}
                        placeholder="Additional details about this symptom..."
                        value={symptom.notes}
                        onChange={(e) => updateSymptom(index, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Factors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary">Contributing Factors</CardTitle>
                  <CardDescription>Track factors that might influence your symptoms</CardDescription>
                </div>
                <Button onClick={addFactor} size="sm" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Factor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {factors.map((factor, index) => (
                <div key={index} className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Factor {index + 1}</Label>
                    {factors.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFactor(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`factor-${index}`}>Factor name</Label>
                      <Input
                        id={`factor-${index}`}
                        placeholder="e.g. Sleep, Stress, Weather"
                        value={factor.factor}
                        onChange={(e) => updateFactor(index, 'factor', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`value-${index}`}>Value/Level</Label>
                      <Input
                        id={`value-${index}`}
                        placeholder="e.g. 8 hours, High, Rainy"
                        value={factor.value}
                        onChange={(e) => updateFactor(index, 'value', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`factor-notes-${index}`}>Notes (optional)</Label>
                    <Textarea
                      id={`factor-notes-${index}`}
                      placeholder="Additional details about this factor..."
                      value={factor.notes}
                      onChange={(e) => updateFactor(index, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              size="lg"
              className="flex items-center gap-2 min-w-32"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackSymptoms;