import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Trophy, Target, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Dashboard = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<[string, number][]>([]);
  const [activeGoals, setActiveGoals] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchDashboardData(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    // Fetch transactions
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId);

    if (txData) {
      const totalIncome = txData
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = txData
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      setIncome(totalIncome);
      setExpenses(totalExpenses);
      setBalance(totalIncome - totalExpenses);

      // Category breakdown
      const breakdown: Record<string, number> = {};
      txData
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
        });
      setCategoryBreakdown(Object.entries(breakdown));
    }

    // Fetch rewards
    const { data: rewardsData } = await supabase
      .from("rewards")
      .select("streak, points")
      .eq("user_id", userId)
      .single();

    if (rewardsData) {
      setStreak(rewardsData.streak);
      setPoints(rewardsData.points);
    }

    // Fetch active goals
    const { data: goalsData } = await supabase
      .from("savings_goals")
      .select("id")
      .eq("user_id", userId)
      .is("completed_at", null);

    setActiveGoals(goalsData?.length || 0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-6">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">FinTrack</h1>
            <p className="text-sm opacity-90">Your Financial Companion</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate("/profile")}
          >
            <User className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-6 -mt-8">
        {/* Balance Card with Transaction Button */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Wallet className="w-8 h-8 text-primary" />
                <p className="text-5xl font-bold">Z{balance.toFixed(2)}</p>
              </div>
              <Button 
                onClick={() => navigate("/transactions")} 
                className="w-full mb-4"
                size="lg"
              >
                + Add Transaction
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-xl font-semibold text-success">+Z{income.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-xl font-semibold text-destructive">-Z{expenses.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/goals")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="text-warning">Streak</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">{points} points</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/goals")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-primary">Goals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeGoals}</p>
              <p className="text-xs text-muted-foreground mt-1">active goals</p>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Minimized */}
        {categoryBreakdown.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryBreakdown.slice(0, 3).map(([category, amount]) => {
                    const total = categoryBreakdown.reduce((sum, [, amt]) => sum + amt, 0);
                    const percentage = ((amount / total) * 100).toFixed(0);
                    return (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">
                          {percentage}% (Z{amount.toFixed(2)})
                        </span>
                      </div>
                    );
                  })}
                  {categoryBreakdown.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2" 
                      onClick={() => navigate("/insights")}
                    >
                      View All Categories
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
