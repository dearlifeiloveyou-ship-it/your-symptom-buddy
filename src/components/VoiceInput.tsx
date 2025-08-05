import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onTextToSpeech?: (text: string) => void;
  sessionType?: 'symptom_input' | 'ai_coach' | 'health_assessment';
  className?: string;
  autoPlayResponses?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onTextToSpeech,
  sessionType = 'symptom_input',
  className = '',
  autoPlayResponses = false
}) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      currentAudio?.pause();
    };
  }, [currentAudio]);

  const startRecording = async () => {
    if (!user) {
      toast.error('Please sign in to use voice features');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      // Set up audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      mediaRecorder.start(100); // Record in 100ms chunks
      setIsRecording(true);
      updateAudioLevel();

      toast.success('Recording started. Speak clearly into your microphone.');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: {
              audio: base64Audio,
              sessionType
            }
          });

          if (error) throw error;

          if (data.text) {
            onTranscript(data.text);
            toast.success('Speech transcribed successfully!');
          } else {
            toast.warning('No speech detected. Please try again.');
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
          toast.error('Failed to transcribe audio. Please try again.');
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process recording.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playTextAsAudio = async (text: string) => {
    if (!user) return;

    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: {
          text,
          voice: 'alloy',
          sessionType
        }
      });

      if (error) throw error;

      // Create audio element and play
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      setCurrentAudio(audio);
      
      audio.onended = () => setCurrentAudio(null);
      audio.onerror = () => {
        toast.error('Failed to play audio response');
        setCurrentAudio(null);
      };

      await audio.play();
      
      if (onTextToSpeech) {
        onTextToSpeech(text);
      }
    } catch (error) {
      console.error('Error playing text as audio:', error);
      toast.error('Failed to generate audio response');
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Recording Button */}
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        variant={isRecording ? 'destructive' : 'outline'}
        size="sm"
        className="relative"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        {isRecording && (
          <span className="ml-2">Recording...</span>
        )}
      </Button>

      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="flex items-center gap-1">
          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(audioLevel)}
          </Badge>
        </div>
      )}

      {/* Audio Control */}
      {currentAudio && (
        <Button
          onClick={stopAudio}
          variant="outline"
          size="sm"
          className="text-blue-600"
        >
          <VolumeX className="w-4 h-4" />
        </Button>
      )}

      {/* Text-to-Speech Button (optional) */}
      {onTextToSpeech && !currentAudio && (
        <Button
          onClick={() => {
            const textToSpeak = "Hello! I'm ready to help you describe your symptoms. You can speak to me and I'll transcribe what you say.";
            playTextAsAudio(textToSpeak);
          }}
          variant="outline"
          size="sm"
          className="text-blue-600"
        >
          <Volume2 className="w-4 h-4" />
        </Button>
      )}

      {isProcessing && (
        <Badge variant="secondary" className="animate-pulse">
          Processing...
        </Badge>
      )}
    </div>
  );
};

export default VoiceInput;