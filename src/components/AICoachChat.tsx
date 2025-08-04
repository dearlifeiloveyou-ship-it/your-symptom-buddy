import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Brain, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  coach_type: 'health' | 'mental_health';
}

interface AICoachChatProps {
  coachType: 'health' | 'mental_health';
  onClose: () => void;
}

const AICoachChat: React.FC<AICoachChatProps> = ({ coachType, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_type', coachType)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      const historyMessages: Message[] = [];
      data?.forEach((conversation) => {
        historyMessages.push({
          id: `${conversation.id}-user`,
          content: conversation.user_message,
          sender: 'user',
          timestamp: new Date(conversation.created_at),
          coach_type: conversation.coach_type as 'health' | 'mental_health'
        });
        historyMessages.push({
          id: `${conversation.id}-ai`,
          content: conversation.ai_response,
          sender: 'ai',
          timestamp: new Date(conversation.created_at),
          coach_type: conversation.coach_type as 'health' | 'mental_health'
        });
      });

      setMessages(historyMessages);
      setConversationHistory(data || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      coach_type: coachType
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputMessage('');

    try {
      // Get user profile for context
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const functionName = coachType === 'health' ? 'health-coach' : 'mental-health-coach';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          message: inputMessage,
          userProfile: profile,
          mood: coachType === 'mental_health' ? getCurrentMood() : undefined,
          stressLevel: coachType === 'mental_health' ? getCurrentStressLevel() : undefined
        }
      });

      if (error) {
        if (error.message?.includes('Premium subscription required')) {
          toast.error('Premium subscription required for AI Coach features');
          return;
        }
        throw error;
      }

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
        coach_type: coachType
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response from AI coach. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentMood = () => {
    // This could be enhanced to get actual tracked mood data
    return 'neutral';
  };

  const getCurrentStressLevel = () => {
    // This could be enhanced to get actual tracked stress data
    return 'moderate';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const coachInfo = {
    health: {
      name: 'AI Health Coach',
      icon: Heart,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Your personal wellness and preventive health guide'
    },
    mental_health: {
      name: 'AI Mental Health Coach',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Supportive guidance for emotional well-being'
    }
  };

  const currentCoach = coachInfo[coachType];
  const CoachIcon = currentCoach.icon;

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={`${currentCoach.bgColor}`}>
              <AvatarFallback className={`${currentCoach.color} ${currentCoach.bgColor}`}>
                <CoachIcon className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentCoach.name}
                <Badge variant="secondary" className="text-xs">Premium</Badge>
              </CardTitle>
              <CardDescription>{currentCoach.description}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <CoachIcon className={`w-12 h-12 mx-auto mb-3 ${currentCoach.color}`} />
                <p className="text-lg font-medium">Welcome to your {currentCoach.name}!</p>
                <p className="text-sm">
                  {coachType === 'health' 
                    ? 'Ask me about wellness, nutrition, exercise, preventive care, or any health concerns.'
                    : 'I\'m here to support your mental health and emotional well-being. Share what\'s on your mind.'
                  }
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <Avatar className={`${currentCoach.bgColor} flex-shrink-0`}>
                    <AvatarFallback className={`${currentCoach.color} ${currentCoach.bgColor}`}>
                      <CoachIcon className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : `${currentCoach.bgColor} ${currentCoach.color}`
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                {message.sender === 'user' && (
                  <Avatar className="bg-primary flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className={`${currentCoach.bgColor} flex-shrink-0`}>
                  <AvatarFallback className={`${currentCoach.color} ${currentCoach.bgColor}`}>
                    <CoachIcon className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className={`${currentCoach.bgColor} ${currentCoach.color} rounded-lg px-4 py-2`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              coachType === 'health'
                ? 'Ask about your health, wellness goals, or any concerns...'
                : 'Share what\'s on your mind or how you\'re feeling...'
            }
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          <p>
            This AI coach provides supportive guidance and is not a replacement for professional medical or mental health care.
            {coachType === 'mental_health' && ' If you\'re experiencing a crisis, please contact emergency services or a crisis hotline.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICoachChat;