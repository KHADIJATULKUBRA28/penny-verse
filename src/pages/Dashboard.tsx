import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Trophy, Target, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingPenny from "@/components/FloatingPenny";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState(0);
  const [upiId, setUpiId] = useState("");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<[string, number][]>([]);
  const [activeGoals, setActiveGoals] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");

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
      .select("wallet_balance, upi_id, monthly_income")
      .eq("id", userId)
      .single();

    if (profileData) {
      setWalletBalance(profileData.wallet_balance || 0);
      setUpiId(profileData.upi_id || "");
      setMonthlyIncome(profileData.monthly_income || 0);
      
      // Show income dialog if not set
      if (!profileData.monthly_income || profileData.monthly_income === 0) {
        setShowIncomeDialog(true);
      }
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

  const handleIncomeSubmit = async () => {
    const income = parseFloat(incomeInput);
    if (!income || income <= 0) {
      toast({ title: "Please enter a valid income amount", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ monthly_income: income })
      .eq("id", user.id);

    if (!error) {
      setMonthlyIncome(income);
      setShowIncomeDialog(false);
      toast({ title: "Monthly income saved! 🎉" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to Pennyverse! 🎉</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To help you manage your savings goals, please tell us your monthly income.
            </p>
            <div>
              <Label htmlFor="income">Monthly Income (PP)</Label>
              <Input
                id="income"
                type="number"
                placeholder="e.g., 50000"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button onClick={handleIncomeSubmit} className="w-full" size="lg">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header with Gradient */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground p-8 shadow-lg">
        <div className="container max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Pennyverse</h1>
              <p className="text-sm opacity-90">Smart Savings & Wellness</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={() => navigate("/profile")}
            >
              <User className="w-6 h-6" />
            </Button>
          </div>

          {/* Wallet Balance Card - Elevated Design */}
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {walletBalance.toFixed(2)}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">PP</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/transactions")} 
                  size="lg"
                  className="h-14 px-8 shadow-lg hover:shadow-xl transition-all"
                >
                  Receive Money
                </Button>
              </div>
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Your UPI ID</p>
                <p className="text-sm font-mono font-semibold text-primary">{upiId || "Loading..."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-6 -mt-4">{/* Rest of dashboard content */}

        {/* Quick Stats - Enhanced Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-warning" onClick={() => navigate("/goals")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <span className="text-warning">Streak</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                {points} points
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary" onClick={() => navigate("/vaults")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <span className="text-primary">Vaults</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{activeGoals}</p>
              <p className="text-xs text-muted-foreground mt-2">active goal vaults</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown - Refined */}
        {categoryBreakdown.length > 0 && (
          <div className="mb-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <span className="text-lg">📊</span>
                  </div>
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryBreakdown.slice(0, 3).map(([category, amount]) => {
                    const total = categoryBreakdown.reduce((sum, [, amt]) => sum + amt, 0);
                    const percentage = ((amount / total) * 100).toFixed(0);
                    return (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="font-medium truncate max-w-[50%]">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground min-w-[3ch] text-right">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {categoryBreakdown.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 hover:bg-primary/10" 
                      onClick={() => navigate("/insights")}
                    >
                      View All →
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
