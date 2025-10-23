import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const categories = [
  { emoji: "🍔", label: "Food & Dining", value: "Food & Dining" },
  { emoji: "🚗", label: "Travel", value: "Travel" },
  { emoji: "🛍️", label: "Shopping", value: "Shopping" },
  { emoji: "💡", label: "Bills", value: "Bills" },
  { emoji: "🏠", label: "Rent", value: "Rent" },
  { emoji: "🎉", label: "Entertainment", value: "Entertainment" },
  { emoji: "⚙️", label: "Others", value: "General Expense" },
];

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: string;
  created_at: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchTransactions();
    };

    checkAuth();
  }, [navigate]);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching transactions", variant: "destructive" });
    } else {
      setTransactions(data || []);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || !category) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: parseFloat(amount),
      description: description || category,
      category,
      type,
    });

    if (error) {
      toast({ title: "Error adding transaction", variant: "destructive" });
    } else {
      // Update streak if it's a saving transaction
      if (type === "income") {
        await updateStreak(user.id);
      }
      
      toast({ title: "Transaction added successfully!" });
      setAmount("");
      setDescription("");
      setCategory("");
      setIsOpen(false);
      fetchTransactions();
    }
  };

  const updateStreak = async (userId: string) => {
    try {
      // Get current rewards
      const { data: currentRewards } = await supabase
        .from("rewards")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!currentRewards) {
        // Create rewards entry if it doesn't exist
        await supabase.from("rewards").insert({
          user_id: userId,
          points: 10,
          streak: 1,
          last_update: new Date().toISOString(),
        });
        return;
      }

      // Check if last update was yesterday or earlier
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastUpdate = new Date(currentRewards.last_update);
      lastUpdate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Continue streak
        await supabase.from("rewards").update({
          points: currentRewards.points + 10,
          streak: currentRewards.streak + 1,
          last_update: new Date().toISOString(),
        }).eq("user_id", userId);
      } else if (daysDiff > 1) {
        // Streak broken, reset
        await supabase.from("rewards").update({
          points: currentRewards.points + 10,
          streak: 1,
          last_update: new Date().toISOString(),
        }).eq("user_id", userId);
      } else if (daysDiff === 0) {
        // Same day, just add points
        await supabase.from("rewards").update({
          points: currentRewards.points + 5,
          last_update: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };

  const getCategoryEmoji = (cat: string) => {
    return categories.find((c) => c.value === cat)?.emoji || "💰";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full h-14 w-14 shadow-lg">
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={type === "expense" ? "default" : "outline"}
                    onClick={() => setType("expense")}
                    className="flex-1"
                  >
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Expense
                  </Button>
                  <Button
                    variant={type === "income" ? "default" : "outline"}
                    onClick={() => setType("income")}
                    className="flex-1"
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Income
                  </Button>
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          category === cat.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.emoji}</div>
                        <div className="text-xs">{cat.label.split(" ")[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Add a note..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <Button onClick={handleAddTransaction} className="w-full">
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getCategoryEmoji(transaction.category)}</div>
                    <div>
                      <p className="font-semibold">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      transaction.type === "income" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}{transaction.amount.toFixed(2)} PP
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Transactions;
