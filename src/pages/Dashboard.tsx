import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Trophy, Target, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingPenny from "@/components/FloatingPenny";

const Dashboard = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [upiId, setUpiId] = useState("");
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
    // Fetch profile with wallet balance and UPI ID
    const { data: profileData } = await supabase
      .from("profiles")
      .select("wallet_balance, upi_id")
      .eq("id", userId)
      .single();

    if (profileData) {
      setWalletBalance(profileData.wallet_balance || 0);
      setUpiId(profileData.upi_id || "");
    }

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

    // Fetch active vaults
    const { data: vaultsData } = await supabase
      .from("goal_vaults")
      .select("id")
      .eq("user_id", userId)
      .eq("is_broken", false);

    setActiveGoals(vaultsData?.length || 0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-6">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Pennyverse</h1>
            <p className="text-sm opacity-90">Smart Savings & Wellness</p>
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
        {/* Wallet Balance Card */}
        <Card className="mb-6 shadow-lg bg-gradient-to-br from-card to-card/95">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-10 h-10 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-5xl font-bold">₹{walletBalance.toFixed(2)}</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/transactions")} 
                size="lg"
                className="h-12 px-6"
              >
                Receive Money
              </Button>
            </div>
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Your UPI ID</p>
              <p className="text-sm font-mono font-semibold text-primary">{upiId || "Loading..."}</p>
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

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/vaults")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-primary">Vaults</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeGoals}</p>
              <p className="text-xs text-muted-foreground mt-1">goal vaults</p>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart - Minimized */}
        {categoryBreakdown.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {categoryBreakdown.slice(0, 3).map(([category, amount]) => {
                    const total = categoryBreakdown.reduce((sum, [, amt]) => sum + amt, 0);
                    const percentage = ((amount / total) * 100).toFixed(0);
                    return (
                      <div key={category} className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate max-w-[50%]">{category}</span>
                        <span className="text-muted-foreground">{percentage}%</span>
                      </div>
                    );
                  })}
                  {categoryBreakdown.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-1" 
                      onClick={() => navigate("/insights")}
                    >
                      View All
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
      <FloatingPenny />
    </div>
  );
};

export default Dashboard;
