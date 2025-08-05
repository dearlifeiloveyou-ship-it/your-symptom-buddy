import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  systemPrompt?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  onResponse?: (text: string, audioUrl?: string) => void;
  className?: string;
}

export default function VoiceChat({ 
  systemPrompt = "You are a helpful health assistant. Respond warmly and provide helpful guidance about health concerns.",
  voice = 'alloy',
  onResponse,
  className = ""
}: VoiceChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversation, setConversation] = useState<Array<{text: string, sender: 'user' | 'ai'}>>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use voice chat",
        variant: "destructive"
      });
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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        await processVoiceInput();
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(250);
      setIsRecording(true);
      
      toast({
        title: "🎤 Listening",
        description: "Speak your health question or concern",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processVoiceInput = async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Transcribe user's voice
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: base64Audio,
          sessionType: 'ai_coach'
        }
      });

      if (transcriptError) throw transcriptError;

      const userText = transcriptData.text;
      if (!userText.trim()) {
        toast({
          title: "No Speech Detected",
          description: "Please try speaking again",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Add user message to conversation
      setConversation(prev => [...prev, { text: userText, sender: 'user' }]);

      // Generate AI response
      const { data: coachData, error: coachError } = await supabase.functions.invoke('health-coach', {
        body: { 
          message: userText,
          conversation: conversation,
          systemPrompt: systemPrompt
        }
      });

      if (coachError) throw coachError;

      const aiResponse = coachData.response;
      setConversation(prev => [...prev, { text: aiResponse, sender: 'ai' }]);

      // Convert AI response to speech
      const { data: speechData, error: speechError } = await supabase.functions.invoke('text-to-voice', {
        body: { 
          text: aiResponse,
          voice: voice,
          sessionType: 'ai_coach'
        }
      });

      if (speechError) throw speechError;

      // Play AI response
      const audioData = atob(speechData.audioContent);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob2 = new Blob([audioArray], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob2);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        setIsPlaying(true);
        await audioRef.current.play();
      }

      if (onResponse) {
        onResponse(aiResponse, audioUrl);
      }

      toast({
        title: "✅ Response Ready",
        description: "AI health coach has responded",
      });

    } catch (error) {
      console.error('Error processing voice input:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process your voice input",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    stopAudio();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Voice Health Chat
        </CardTitle>
        <CardDescription>
          Have a natural conversation with your AI health coach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-secondary/20 rounded-lg">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded ${
                  msg.sender === 'user' 
                    ? 'bg-primary/10 text-primary ml-4' 
                    : 'bg-secondary text-foreground mr-4'
                }`}
              >
                <strong>{msg.sender === 'user' ? 'You:' : 'AI Coach:'}</strong> {msg.text}
              </div>
            ))}
          </div>
        )}

        {/* Voice Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isPlaying}
            size="lg"
            className={`relative ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="ml-2">
              {isProcessing ? 'Processing...' : 
               isRecording ? 'Stop Recording' : 
               'Start Voice Chat'}
            </span>
          </Button>

          {isPlaying && (
            <Button onClick={stopAudio} variant="outline">
              <VolumeX className="w-4 h-4 mr-2" />
              Stop Audio
            </Button>
          )}

          {conversation.length > 0 && (
            <Button onClick={clearConversation} variant="outline" size="sm">
              Clear Chat
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              🧠 AI is thinking...
            </Badge>
          )}
          {isRecording && (
            <Badge variant="destructive">
              🔴 Recording - speak your question
            </Badge>
          )}
          {isPlaying && (
            <Badge variant="default">
              🔊 AI is responding
            </Badge>
          )}
          {!isRecording && !isProcessing && !isPlaying && (
            <p className="text-sm text-muted-foreground">
              Click "Start Voice Chat" to begin a conversation with your AI health coach
            </p>
          )}
        </div>

        {/* Audio Player (Hidden) */}
        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}