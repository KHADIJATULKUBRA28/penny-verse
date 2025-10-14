import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Sparkles, Crown, Star, Zap } from "lucide-react";

interface StreakBadgesProps {
  streak: number;
  points: number;
}

const StreakBadges = ({ streak, points }: StreakBadgesProps) => {
  const achievements = [
    { name: "Beginner", icon: Star, minStreak: 1, color: "text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", description: "Started your journey!" },
    { name: "Consistent", icon: Zap, minStreak: 3, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900", description: "3 days streak" },
    { name: "Committed", icon: Flame, minStreak: 7, color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900", description: "7 days on fire!" },
    { name: "Dedicated", icon: Sparkles, minStreak: 14, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900", description: "2 weeks strong" },
    { name: "Champion", icon: Trophy, minStreak: 30, color: "text-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-900", description: "30 days champion!" },
    { name: "Legend", icon: Crown, minStreak: 60, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900", description: "2 months legend!" },
  ];

  const currentAchievement = [...achievements].reverse().find(a => streak >= a.minStreak) || achievements[0];
  const nextAchievement = achievements.find(a => streak < a.minStreak);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Your Achievements
        </CardTitle>
        <CardDescription>Keep building your streak!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Badge */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${currentAchievement.bgColor}`}>
            <currentAchievement.icon className={`w-10 h-10 ${currentAchievement.color}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{currentAchievement.name}</h3>
            <p className="text-sm text-muted-foreground">{currentAchievement.description}</p>
          </div>
          <div className="flex gap-4 justify-center items-center">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              🔥 {streak} day streak
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              ⭐ {points} points
            </Badge>
          </div>
        </div>

        {/* Next Goal */}
        {nextAchievement && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">Next achievement:</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${nextAchievement.bgColor}`}>
                <nextAchievement.icon className={`w-6 h-6 ${nextAchievement.color}`} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{nextAchievement.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {nextAchievement.minStreak - streak} more days to unlock
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Achievements */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">All achievements:</p>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement) => {
              const isUnlocked = streak >= achievement.minStreak;
              return (
                <div
                  key={achievement.name}
                  className={`text-center p-2 rounded-lg transition-all ${
                    isUnlocked
                      ? `${achievement.bgColor} scale-100`
                      : "bg-muted/30 opacity-50 grayscale scale-95"
                  }`}
                  title={`${achievement.name} - ${achievement.description}`}
                >
                  <achievement.icon
                    className={`w-6 h-6 mx-auto mb-1 ${isUnlocked ? achievement.color : "text-muted-foreground"}`}
                  />
                  <p className="text-xs font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.minStreak}d</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakBadges;
