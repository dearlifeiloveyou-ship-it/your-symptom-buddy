import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Clock, Heart, Trophy, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSettings {
  dailyCheckIn: boolean;
  streakReminder: boolean;
  healthTips: boolean;
  medicationReminder: boolean;
  assessmentFollow: boolean;
}

interface NotificationManagerProps {
  className?: string;
}

export default function NotificationManager({ className = "" }: NotificationManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyCheckIn: true,
    streakReminder: true,
    healthTips: true,
    medicationReminder: false,
    assessmentFollow: true
  });

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        
        if (result === 'granted') {
          toast({
            title: "🔔 Notifications Enabled",
            description: "You'll now receive helpful health reminders!",
          });
          
          // Send welcome notification
          new Notification('MDSDR Notifications Enabled! 🎉', {
            body: 'We\'ll help you stay on track with your health journey',
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
          
          scheduleNotifications();
        } else {
          toast({
            title: "Notifications Disabled",
            description: "You can enable them later in your browser settings",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const scheduleNotifications = () => {
    if (permission !== 'granted') return;

    // Clear existing notifications
    clearScheduledNotifications();

    // Schedule daily check-in (9 AM)
    if (settings.dailyCheckIn) {
      scheduleDaily(9, 0, 'Daily Health Check-In 🌅', 'How are you feeling today? Track your symptoms to earn points!');
    }

    // Schedule streak reminder (8 PM)
    if (settings.streakReminder) {
      scheduleDaily(20, 0, 'Keep Your Streak Going! 🔥', 'Don\'t forget to log your symptoms to maintain your streak!');
    }

    // Schedule health tips (2 PM)
    if (settings.healthTips) {
      scheduleDaily(14, 0, 'Daily Health Tip 💡', getRandomHealthTip());
    }

    // Schedule assessment follow-up (weekly)
    if (settings.assessmentFollow) {
      scheduleWeekly('Follow-up Assessment 📋', 'It\'s been a week since your last assessment. How are you feeling?');
    }
  };

  const scheduleDaily = (hour: number, minute: number, title: string, body: string) => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime.getTime() <= now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      if (permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `daily-${hour}-${minute}` // Prevents duplicate notifications
        });
      }
      
      // Schedule the next occurrence (24 hours later)
      setInterval(() => {
        if (permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `daily-${hour}-${minute}`
          });
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, timeUntilNotification);
  };

  const scheduleWeekly = (title: string, body: string) => {
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    setTimeout(() => {
      if (permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'weekly-assessment'
        });
      }
      
      // Schedule recurring weekly notifications
      setInterval(() => {
        if (permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'weekly-assessment'
          });
        }
      }, oneWeek);
      
    }, oneWeek);
  };

  const clearScheduledNotifications = () => {
    // Clear any existing timeouts would require tracking them
    // For now, we rely on tag-based deduplication
  };

  const getRandomHealthTip = () => {
    const tips = [
      'Stay hydrated! Aim for 8 glasses of water daily 💧',
      'Take a 10-minute walk to boost your mood and energy 🚶‍♀️',
      'Practice deep breathing for 2 minutes to reduce stress 🧘‍♂️',
      'Get 7-9 hours of sleep for optimal health 😴',
      'Eat a colorful variety of fruits and vegetables 🌈',
      'Stretch for 5 minutes to improve flexibility 🤸‍♀️',
      'Connect with a friend or family member today 👥',
      'Spend 10 minutes in sunlight for vitamin D ☀️',
      'Practice gratitude by writing down 3 things you\'re thankful for 📝',
      'Take breaks from screens every hour 👀'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Re-schedule notifications with new settings
    if (permission === 'granted') {
      scheduleNotifications();
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification 🧪', {
        body: 'This is a test notification from MDSDR!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test'
      });
      
      toast({
        title: "Test Sent!",
        description: "Check if you received the notification",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Smart Notifications
        </CardTitle>
        <CardDescription>
          Stay engaged with your health journey through personalized reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                Notification Status
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' ? 'Enabled and active' : 
                 permission === 'denied' ? 'Blocked by browser' : 'Not yet enabled'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
              {permission === 'granted' ? 'Active' : 
               permission === 'denied' ? 'Blocked' : 'Inactive'}
            </Badge>
            {permission !== 'granted' && (
              <Button onClick={requestPermission} size="sm">
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Test Button */}
        {permission === 'granted' && (
          <Button 
            onClick={testNotification} 
            variant="outline" 
            className="w-full"
          >
            Send Test Notification
          </Button>
        )}

        {/* Notification Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Preferences</h4>
          
          <div className="space-y-3">
            {/* Daily Check-in */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-red-500" />
                <div>
                  <p className="font-medium">Daily Health Check-in</p>
                  <p className="text-sm text-muted-foreground">Morning reminder at 9 AM</p>
                </div>
              </div>
              <Switch
                checked={settings.dailyCheckIn}
                onCheckedChange={(checked) => updateSetting('dailyCheckIn', checked)}
              />
            </div>

            {/* Streak Reminder */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="font-medium">Streak Maintenance</p>
                  <p className="text-sm text-muted-foreground">Evening reminder at 8 PM</p>
                </div>
              </div>
              <Switch
                checked={settings.streakReminder}
                onCheckedChange={(checked) => updateSetting('streakReminder', checked)}
              />
            </div>

            {/* Health Tips */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="font-medium">Daily Health Tips</p>
                  <p className="text-sm text-muted-foreground">Afternoon tips at 2 PM</p>
                </div>
              </div>
              <Switch
                checked={settings.healthTips}
                onCheckedChange={(checked) => updateSetting('healthTips', checked)}
              />
            </div>

            {/* Assessment Follow-up */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-green-500" />
                <div>
                  <p className="font-medium">Assessment Follow-ups</p>
                  <p className="text-sm text-muted-foreground">Weekly check-in reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.assessmentFollow}
                onCheckedChange={(checked) => updateSetting('assessmentFollow', checked)}
              />
            </div>
          </div>
        </div>

        {/* Usage Tip */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Tip:</strong> Enable notifications to stay consistent with your health tracking and maximize your gamification rewards!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}