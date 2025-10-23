import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Lock, LockOpen, Plus, Flame, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";

interface GoalVault {
  id: string;
  goal_name: string;
  target_amount: number;
  saved_amount: number;
  daily_save_amount: number;
  is_locked: boolean;
  streak_days: number;
  emoji: string;
  is_broken: boolean;
}

const Vaults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vaults, setVaults] = useState<GoalVault[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVault, setNewVault] = useState({
    goal_name: "",
    target_amount: "",
    daily_save_amount: "",
    emoji: "🎯"
  });

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchVaults();
    fetchWalletBalance();
  };

  const fetchVaults = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("goal_vaults")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_broken", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVaults(data);
    }
  };

  const fetchWalletBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("wallet_balance, monthly_income")
      .eq("id", user.id)
      .single();

    if (data) {
      setWalletBalance(data.wallet_balance || 0);
      setMonthlyIncome(data.monthly_income || 0);
    }
  };

  const handleCreateVault = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetAmount = parseFloat(newVault.target_amount);
    const dailyAmount = parseFloat(newVault.daily_save_amount);

    if (!newVault.goal_name || targetAmount <= 0 || dailyAmount <= 0) {
      toast({ title: "Please fill all fields with valid values", variant: "destructive" });
      return;
    }

    // Check 20% income limit
    const maxGoalAmount = monthlyIncome * 0.2;
    if (targetAmount > maxGoalAmount) {
      toast({ 
        title: "Goal amount too high", 
        description: `You can only save up to 20% of your monthly income (${Math.floor(maxGoalAmount)} PP) per goal`,
        variant: "destructive" 
      });
      return;
    }

    const { error } = await supabase.from("goal_vaults").insert({
      user_id: user.id,
      goal_name: newVault.goal_name,
      target_amount: targetAmount,
      daily_save_amount: dailyAmount,
      emoji: newVault.emoji
    });

    if (error) {
      toast({ title: "Error creating vault", variant: "destructive" });
    } else {
      toast({ title: "Goal Vault created! 🎉" });
      setShowCreateDialog(false);
      setNewVault({ goal_name: "", target_amount: "", daily_save_amount: "", emoji: "🎯" });
      fetchVaults();
    }
  };

  const handleSaveToVault = async (vaultId: string, amount: number) => {
    if (amount > walletBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update vault
    const { error: vaultError } = await supabase
      .from("goal_vaults")
      .update({
        saved_amount: vault.saved_amount + amount,
        last_save_date: new Date().toISOString().split('T')[0],
        streak_days: vault.streak_days + 1
      })
      .eq("id", vaultId);

    // Deduct from wallet
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ wallet_balance: walletBalance - amount })
      .eq("id", user.id);

    if (!vaultError && !profileError) {
      // Award bonus points for streaks
      const streakBonus = Math.floor((vault.streak_days + 1) / 7) * 10; // 10 points per week
      if (streakBonus > 0) {
        const { data: rewardsData } = await supabase
          .from("rewards")
          .select("points, lifetime_points")
          .eq("user_id", user.id)
          .single();

        if (rewardsData) {
          await supabase
            .from("rewards")
            .update({
              points: rewardsData.points + streakBonus,
              lifetime_points: (rewardsData.lifetime_points || 0) + streakBonus
            })
            .eq("user_id", user.id);
        }
      }

      toast({ 
        title: `${amount} PP saved to ${vault.goal_name}! 💪`, 
        description: `Streak: ${vault.streak_days + 1} days 🔥${streakBonus > 0 ? ` +${streakBonus} bonus points!` : ''}` 
      });
      fetchVaults();
      fetchWalletBalance();
    }
  };

  const handleBreakVault = async (vaultId: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark vault as broken
    const { error: vaultError } = await supabase
      .from("goal_vaults")
      .update({
        is_broken: true,
        is_locked: false,
        broken_at: new Date().toISOString()
      })
      .eq("id", vaultId);

    // Return funds to wallet
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ wallet_balance: walletBalance + vault.saved_amount })
      .eq("id", user.id);

    if (!vaultError && !profileError) {
      toast({
        title: "Vault Broken 💔",
        description: `${vault.saved_amount} PP returned to wallet. Progress lost.`,
        variant: "destructive"
      });
      fetchVaults();
      fetchWalletBalance();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Goal Vaults</h1>
            <p className="text-sm text-muted-foreground">Lock your savings & achieve goals</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Vault
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal Vault</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Goal Name</Label>
                  <Input
                    placeholder="e.g., Vacation, Laptop"
                    value={newVault.goal_name}
                    onChange={(e) => setNewVault({ ...newVault, goal_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Target Amount (PP)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={newVault.target_amount}
                    onChange={(e) => setNewVault({ ...newVault, target_amount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {Math.floor(monthlyIncome * 0.2)} PP (20% of monthly income)
                  </p>
                </div>
                <div>
                  <Label>Daily Save Amount (PP)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newVault.daily_save_amount}
                    onChange={(e) => setNewVault({ ...newVault, daily_save_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Choose Emoji</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["🎯", "💰", "✈️", "💻", "🏠", "🚗", "🎓"].map(emoji => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={newVault.emoji === emoji ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewVault({ ...newVault, emoji })}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateVault} className="w-full">
                  Create Vault
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {vaults.map((vault) => {
            const progress = (vault.saved_amount / vault.target_amount) * 100;
            return (
              <Card key={vault.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{vault.emoji}</span>
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {vault.goal_name}
                          {vault.is_locked ? (
                            <Lock className="w-4 h-4 text-primary" />
                          ) : (
                            <LockOpen className="w-4 h-4 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Flame className="w-4 h-4 text-warning" />
                          {vault.streak_days} day streak
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{vault.saved_amount} PP / {vault.target_amount} PP</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.toFixed(1)}% complete
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveToVault(vault.id, vault.daily_save_amount)}
                      className="flex-1"
                      disabled={walletBalance < vault.daily_save_amount}
                    >
                      Save Today ({vault.daily_save_amount} PP)
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Break Vault?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will unlock {vault.saved_amount} PP and return it to your wallet, but you'll lose all progress, rewards, and your {vault.streak_days}-day streak.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleBreakVault(vault.id)} className="bg-destructive">
                            Break Vault
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {vaults.length === 0 && (
            <Card className="p-12 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Goal Vaults Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first vault to start saving towards your goals!
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Vault
              </Button>
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Vaults;
