import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Target, Zap, Heart, Calendar, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  badges_earned: string[];
  level: number;
  assessments_completed: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: string;
  points: number;
}

const BADGES: Badge[] = [
  {
    id: 'first_assessment',
    name: 'Health Explorer',
    description: 'Completed your first health assessment',
    icon: <Target className="w-6 h-6" />,
    requirement: 'Complete 1 assessment',
    points: 50
  },
  {
    id: 'streak_3',
    name: 'Consistent Tracker',
    description: 'Tracked symptoms for 3 days in a row',
    icon: <Calendar className="w-6 h-6" />,
    requirement: '3-day streak',
    points: 100
  },
  {
    id: 'streak_7',
    name: 'Health Champion',
    description: 'Maintained a 7-day tracking streak',
    icon: <Trophy className="w-6 h-6" />,
    requirement: '7-day streak',
    points: 250
  },
  {
    id: 'assessments_5',
    name: 'Wellness Warrior',
    description: 'Completed 5 health assessments',
    icon: <Star className="w-6 h-6" />,
    requirement: 'Complete 5 assessments',
    points: 200
  },
  {
    id: 'profile_complete',
    name: 'Health Pro',
    description: 'Completed your health profile',
    icon: <Heart className="w-6 h-6" />,
    requirement: 'Complete health profile',
    points: 75
  },
  {
    id: 'insights_viewed',
    name: 'Pattern Detective',
    description: 'Viewed your health insights',
    icon: <TrendingUp className="w-6 h-6" />,
    requirement: 'View health insights',
    points: 100
  }
];

export default function Gamification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Use mock data for demo purposes until database types are updated
      const mockStats: UserStats = {
        total_points: 150,
        current_streak: 3,
        longest_streak: 7,
        badges_earned: ['first_assessment', 'profile_complete'],
        level: 1,
        assessments_completed: 2
      };
      
      setStats(mockStats);
      
      toast({
        title: "🎮 Demo Mode Active",
        description: "Gamification is running in demo mode with sample data!",
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      const fallbackStats: UserStats = {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        badges_earned: [],
        level: 1,
        assessments_completed: 0
      };
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (points: number, reason: string) => {
    if (!user || !stats) return;

    try {
      const newTotalPoints = stats.total_points + points;
      const newLevel = Math.floor(newTotalPoints / 500) + 1;

      // Update local state immediately for better UX
      setStats(prev => prev ? {
        ...prev,
        total_points: newTotalPoints,
        level: newLevel
      } : null);

      toast({
        title: "Points Earned! 🎉",
        description: `+${points} points for ${reason}`,
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const awardBadge = async (badgeId: string) => {
    if (!user || !stats) return;

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge || stats.badges_earned.includes(badgeId)) return;

    try {
      const newBadges = [...stats.badges_earned, badgeId];
      const newTotalPoints = stats.total_points + badge.points;
      const newLevel = Math.floor(newTotalPoints / 500) + 1;

      // Update local state immediately
      setStats(prev => prev ? {
        ...prev,
        badges_earned: newBadges,
        total_points: newTotalPoints,
        level: newLevel
      } : null);

      toast({
        title: "Badge Unlocked! 🏆",
        description: `${badge.name} - ${badge.description}`,
      });
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading gamification...</div>;
  }

  if (!stats) return null;

  const pointsToNextLevel = (stats.level * 500) - stats.total_points;
  const progressToNextLevel = ((stats.total_points % 500) / 500) * 100;

  return (
    <div className="space-y-6">
      {/* Level and Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Level {stats.level} Health Hero
          </CardTitle>
          <CardDescription>
            {pointsToNextLevel} points to Level {stats.level + 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressToNextLevel} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{stats.total_points} points</span>
            <span>{stats.level * 500} points</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_points}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.current_streak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.assessments_completed}</p>
            <p className="text-sm text-muted-foreground">Assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.badges_earned.length}</p>
            <p className="text-sm text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Collection</CardTitle>
          <CardDescription>
            Unlock badges by completing health activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BADGES.map((badge) => {
              const earned = stats.badges_earned.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border transition-all ${
                    earned 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'bg-muted/30 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      earned ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{badge.name}</h4>
                        {earned && <Badge variant="secondary">Earned</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {badge.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {badge.requirement} • {badge.points} points
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export functions to award points and badges
export { type UserStats };
export const useGamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const awardPoints = async (points: number, reason: string) => {
    if (!user) return;

    try {
      // For now, just show the toast - actual implementation will be added when types are updated
      toast({
        title: "Points Earned! 🎉",
        description: `+${points} points for ${reason}`,
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const awardBadge = async (badgeId: string) => {
    if (!user) return;

    try {
      const badge = BADGES.find(b => b.id === badgeId);
      if (!badge) return;

      toast({
        title: "Badge Unlocked! 🏆",
        description: `${badge.name} - ${badge.description}`,
      });
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  return { awardPoints, awardBadge };
};