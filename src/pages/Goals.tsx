import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SavingsGoalComponent, { SavingsGoal } from "@/components/SavingsGoal";
import StreakBadges from "@/components/StreakBadges";
import BottomNav from "@/components/BottomNav";

const Goals = () => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
    fetchRewards();
  }, []);

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSavingsGoals(data);
    }
  };

  const fetchRewards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("rewards")
      .select("streak, points")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setStreak(data.streak);
      setPoints(data.points);
    }
  };

  const handleAddGoal = async (goal: Omit<SavingsGoal, "id" | "completed_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      title: goal.title,
      target_amount: goal.target_amount,
      current_amount: 0,
      deadline: goal.deadline,
      emoji: goal.emoji,
    });

    if (error) {
      toast({ title: "Error adding goal", variant: "destructive" });
    } else {
      toast({ title: "Goal added successfully! 🎯" });
      fetchGoals();
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id);

    if (!error) {
      toast({ title: "Goal deleted" });
      fetchGoals();
    }
  };

  const handleUpdateGoal = async (id: string, amount: number) => {
    const { error } = await supabase
      .from("savings_goals")
      .update({ current_amount: amount })
      .eq("id", id);

    if (!error) {
      fetchGoals();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Goals & Achievements</h1>
        
        <div className="space-y-6">
          <StreakBadges streak={streak} points={points} />
          
          <SavingsGoalComponent
            goals={savingsGoals}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            onUpdateGoal={handleUpdateGoal}
          />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Goals;
