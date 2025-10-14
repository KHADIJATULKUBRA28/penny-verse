import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import TransactionScanner from "@/components/TransactionScanner";
import SavingsGoalComponent from "@/components/SavingsGoal";
import ExpensePieChart from "@/components/ExpensePieChart";
import StreakBadges from "@/components/StreakBadges";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Trophy,
  Calendar,
  AlertCircle,
  Loader2,
  Plus,
  LogOut,
} from "lucide-react";

// Type definitions
interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: "expense" | "income";
  category: string;
  created_at: string;
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  renewal_date: string;
}

interface Rewards {
  points: number;
  streak: number;
  last_update: string;
}

interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  emoji: string;
  created_at: string;
  completed_at: string | null;
}

const FinZen = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [userId, setUserId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rewards, setRewards] = useState<Rewards>({ points: 0, streak: 0, last_update: new Date().toISOString() });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  
  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [subName, setSubName] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subDate, setSubDate] = useState("");
  
  // AI states
  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      fetchData(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      } else if (session) {
        setUserId(session.user.id);
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch data
  const fetchData = async (uid: string) => {
    // Fetch transactions
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (txData) setTransactions(txData as Transaction[]);

    // Fetch subscriptions
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", uid);
    if (subData) setSubscriptions(subData);

    // Fetch rewards
    const { data: rewardsData } = await supabase
      .from("rewards")
      .select("*")
      .eq("user_id", uid)
      .single();
    if (rewardsData) setRewards(rewardsData);

    // Fetch savings goals
    const { data: goalsData } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", uid)
      .order("deadline", { ascending: true });
    if (goalsData) setSavingsGoals(goalsData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // AI categorization function
  const getCategory = (desc: string): string => {
    const lower = desc.toLowerCase();
    if (lower.includes("food") || lower.includes("restaurant") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("breakfast")) {
      return "Food & Dining";
    }
    if (lower.includes("uber") || lower.includes("taxi") || lower.includes("bus") || lower.includes("train") || lower.includes("flight")) {
      return "Travel";
    }
    if (lower.includes("amazon") || lower.includes("shopping") || lower.includes("store") || lower.includes("mall")) {
      return "Shopping";
    }
    if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("subscription") || lower.includes("prime")) {
      return "Subscriptions";
    }
    if (lower.includes("electricity") || lower.includes("water") || lower.includes("rent") || lower.includes("bill") || lower.includes("utility")) {
      return "Bills";
    }
    if (lower.includes("salary") || lower.includes("income") || lower.includes("payment") || lower.includes("received")) {
      return "Income";
    }
    return "General Expense";
  };

  // Add transaction
  const handleAddTransaction = async () => {
    if (!amount || !description || !userId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        amount: parseFloat(amount),
        description,
        type: transactionType,
        category: transactionType === "income" ? "Income" : getCategory(description),
      });

      if (error) throw error;

      // Update streak and rewards
      await updateStreak();

      setAmount("");
      setDescription("");
      
      toast({
        title: "Transaction Added",
        description: `${transactionType === "income" ? "Income" : "Expense"} of Z${amount} recorded`,
      });
      
      fetchData(userId);
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  // Handle transaction from scanner
  const handleScannerTransaction = (amt: string, desc: string, txnType: "expense" | "income") => {
    setAmount(amt);
    setDescription(desc);
    setTransactionType(txnType);
    setTimeout(() => handleAddTransaction(), 100);
  };

  // Add subscription
  const handleAddSubscription = async () => {
    if (!subName || !subCost || !subDate || !userId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all subscription fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        name: subName,
        cost: parseFloat(subCost),
        renewal_date: subDate,
      });

      if (error) throw error;

      setSubName("");
      setSubCost("");
      setSubDate("");
      
      toast({
        title: "Subscription Added",
        description: `${subName} subscription tracked successfully`,
      });
      
      fetchData(userId);
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      toast({
        title: "Error",
        description: "Failed to add subscription",
        variant: "destructive",
      });
    }
  };

  // Savings Goals handlers
  const handleAddGoal = async (goal: { title: string; target_amount: number; deadline: string; emoji: string }) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: userId,
        ...goal,
      });

      if (error) throw error;

      toast({
        title: "Goal Created! 🎯",
        description: `${goal.emoji} ${goal.title} - Let's make it happen!`,
      });

      fetchData(userId);
    } catch (error: any) {
      console.error("Error adding goal:", error);
      toast({
        title: "Error",
        description: "Failed to create savings goal",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Goal Deleted",
        description: "Savings goal removed",
      });

      fetchData(userId);
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoal = async (goalId: string, addedAmount: number) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = goal.current_amount + addedAmount;
    const completed = newAmount >= goal.target_amount;

    try {
      const { error } = await supabase
        .from("savings_goals")
        .update({
          current_amount: newAmount,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", goalId);

      if (error) throw error;

      if (completed) {
        toast({
          title: "🎉 Goal Achieved!",
          description: `Congratulations! You've reached your ${goal.emoji} ${goal.title} goal!`,
        });
      } else {
        toast({
          title: "Progress Updated! 💪",
          description: `Added Z${addedAmount} to ${goal.title}`,
        });
      }

      fetchData(userId);
    } catch (error: any) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
    }
  };

  // Update streak logic
  const updateStreak = async () => {
    if (!userId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastUpdate = new Date(rewards.last_update);
      lastUpdate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 1) {
        const dailyBalance = calculateDailyBalance();
        const newStreak = dailyBalance >= 0 ? rewards.streak + 1 : 0;
        const newPoints = dailyBalance >= 0 ? rewards.points + 10 : rewards.points;

        await supabase.from("rewards").update({
          points: newPoints,
          streak: newStreak,
          last_update: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };

  // Calculate daily balance
  const calculateDailyBalance = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.created_at);
      txnDate.setHours(0, 0, 0, 0);
      return txnDate.getTime() === today.getTime();
    });

    return todayTransactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
  };

  // Calculate metrics
  const calculateBalance = (): number => {
    return transactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);
  };

  const calculateTotalExpense = (): number => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryBreakdown = () => {
    const breakdown: { [key: string]: number } = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });

    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  // Check spending alert
  const checkSpendingAlert = (): boolean => {
    const last7Days = transactions.filter((t) => {
      const daysDiff = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7 && t.type === "expense";
    });

    const last7DaysExpense = last7Days.reduce((sum, t) => sum + t.amount, 0);
    
    const olderTransactions = transactions.filter((t) => {
      const daysDiff = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && t.type === "expense";
    });

    if (olderTransactions.length === 0) return false;

    const avgWeeklyExpense = olderTransactions.reduce((sum, t) => sum + t.amount, 0) / 
      (olderTransactions.length / 7);

    return last7DaysExpense > avgWeeklyExpense * 1.25;
  };

  // Check subscription alerts
  const getUpcomingSubscriptions = () => {
    return subscriptions.filter((sub) => {
      const daysUntilRenewal = Math.floor(
        (new Date(sub.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
    });
  };

  // Get badge
  const getBadge = () => {
    if (rewards.streak >= 30) return { name: "Gold Saver", color: "bg-warning" };
    if (rewards.streak >= 7) return { name: "Silver Saver", color: "bg-muted" };
    if (rewards.streak >= 3) return { name: "Bronze Saver", color: "bg-primary" };
    return null;
  };

  // Get AI advice
  const getAIAdvice = async () => {
    setLoadingAI(true);
    setAiAdvice("");

    const balance = calculateBalance();
    const totalExpense = calculateTotalExpense();
    const topCategories = getCategoryBreakdown().slice(0, 3);

    try {
      const { data, error } = await supabase.functions.invoke("financial-advice", {
        body: {
          balance: balance.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          streak: rewards.streak,
          topCategories,
        },
      });

      if (error) throw error;

      if (data?.advice) {
        setAiAdvice(data.advice);
      } else {
        throw new Error("No advice received");
      }
    } catch (error: any) {
      console.error("AI advice error:", error);
      toast({
        title: "AI Error",
        description: error.message || "Unable to fetch personalized advice. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const balance = calculateBalance();
  const totalExpense = calculateTotalExpense();
  const categoryBreakdown = getCategoryBreakdown();
  const showSpendingAlert = checkSpendingAlert();
  const upcomingSubscriptions = getUpcomingSubscriptions();
  const badge = getBadge();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary text-primary-foreground py-8 px-4 shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">FinZen</h1>
                <p className="text-sm opacity-90">Smart UPI Assistant</p>
              </div>
            </div>
            {userId && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  User: {userId.slice(0, 8)}...
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Alerts Section */}
        {(showSpendingAlert || upcomingSubscriptions.length > 0) && (
          <div className="mb-6 space-y-3">
            {showSpendingAlert && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">High Spending Alert!</p>
                      <p className="text-sm text-muted-foreground">
                        Your spending in the last 7 days is 25% higher than your average.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {upcomingSubscriptions.map((sub) => (
              <Card key={sub.id} className="border-warning bg-warning/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-warning" />
                    <div>
                      <p className="font-semibold text-warning">Subscription Renewal</p>
                      <p className="text-sm text-muted-foreground">
                        {sub.name} (Z{sub.cost}) renews on {new Date(sub.renewal_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dashboard Cards */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="w-5 h-5" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">Z{balance.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="w-5 h-5" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">Z{totalExpense.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5" />
                Savings Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-success">{rewards.streak} days</p>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="text-xl font-semibold text-secondary">{rewards.points}</p>
                </div>
              </div>
              {badge && (
                <Badge className={`mt-3 ${badge.color}`}>{badge.name}</Badge>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Transaction Form */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Transaction
            </CardTitle>
            <CardDescription>Record your income or expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                type="number"
                placeholder="Amount (Zcoins)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Button
                variant={transactionType === "expense" ? "default" : "outline"}
                onClick={() => setTransactionType("expense")}
                className="flex-1"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Expense
              </Button>
              <Button
                variant={transactionType === "income" ? "default" : "outline"}
                onClick={() => setTransactionType("income")}
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Income
              </Button>
            </div>
            <Button onClick={handleAddTransaction} className="w-full mt-4">
              Add Transaction
            </Button>
            <TransactionScanner onTransaction={handleScannerTransaction} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <ExpensePieChart categoryBreakdown={categoryBreakdown} />

          {/* Streak Badges */}
          <StreakBadges streak={rewards.streak} points={rewards.points} />

          {/* Savings Goals */}
          <div className="lg:col-span-2">
            <SavingsGoalComponent
              goals={savingsGoals}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              onUpdateGoal={handleUpdateGoal}
            />
          </div>

          {/* Expense Breakdown */}
          <Card className="shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
              <CardDescription>Your spending breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.map(([category, amount], index) => {
                  const maxAmount = categoryBreakdown[0]?.[1] || 1;
                  const percentage = (amount / maxAmount) * 100;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">Z{amount.toFixed(2)}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {categoryBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No expense data yet. Start tracking your transactions!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Manager */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Subscription Manager</CardTitle>
              <CardDescription>Track your recurring payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                <Input
                  placeholder="Subscription Name"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Monthly Cost (Zcoins)"
                  value={subCost}
                  onChange={(e) => setSubCost(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Renewal Date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                />
                <Button onClick={handleAddSubscription} className="w-full">
                  Add Subscription
                </Button>
              </div>

              <div className="space-y-3 mt-6">
                {subscriptions.map((sub) => {
                  const daysUntilRenewal = Math.floor(
                    (new Date(sub.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isUpcoming = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;

                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-lg border ${
                        isUpcoming ? "border-warning bg-warning/5" : "border-border"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Renews: {new Date(sub.renewal_date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold text-lg">Z{sub.cost}</p>
                      </div>
                      {isUpcoming && (
                        <Badge variant="outline" className="mt-2 border-warning text-warning">
                          Renews in {daysUntilRenewal} days
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {subscriptions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No subscriptions tracked yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Financial Coach */}
        <Card className="mt-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              AI Financial Coach
            </CardTitle>
            <CardDescription>Get personalized financial guidance powered by Gemini AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => getAIAdvice()}
              disabled={loadingAI}
              className="w-full mb-4"
              variant="secondary"
            >
              {loadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing your finances...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get ✨ Personalized Financial Advice
                </>
              )}
            </Button>
            {aiAdvice && (
              <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                <p className="text-sm leading-relaxed">{aiAdvice}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="mt-8 shadow-md">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        txn.type === "income" ? "bg-success/20" : "bg-destructive/20"
                      }`}
                    >
                      {txn.type === "income" ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{txn.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        txn.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}Z{txn.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transactions yet. Add your first transaction above!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FinZen;
