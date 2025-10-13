import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  DollarSign,
} from "lucide-react";

// Type definitions
interface Transaction {
  id?: string;
  amount: number;
  description: string;
  type: "expense" | "income";
  category: string;
  timestamp: Timestamp;
}

interface Subscription {
  id?: string;
  name: string;
  cost: number;
  renewalDate: Date;
}

interface Rewards {
  points: number;
  streak: number;
  lastUpdate: Date;
}

// Global Firebase configuration (provided by user)
declare global {
  interface Window {
    __app_id?: string;
    __firebase_config?: any;
    __initial_auth_token?: string;
  }
}

const FinZen = () => {
  const { toast } = useToast();
  
  // State management
  const [userId, setUserId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rewards, setRewards] = useState<Rewards>({ points: 0, streak: 0, lastUpdate: new Date() });
  
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
  
  // Firebase instances
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const appId = window.__app_id || "finzen-app";
        const firebaseConfig = window.__firebase_config || {
          apiKey: "demo-api-key",
          authDomain: "demo.firebaseapp.com",
          projectId: "demo-project",
        };

        const app = initializeApp(firebaseConfig, appId);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setAuth(authInstance);
        setDb(dbInstance);

        // Authenticate user
        if (window.__initial_auth_token) {
          await signInWithCustomToken(authInstance, window.__initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }

        // Listen to auth state
        onAuthStateChanged(authInstance, (user) => {
          if (user) {
            setUserId(user.uid);
            setupListeners(dbInstance, user.uid, appId);
          }
        });
      } catch (error) {
        console.error("Firebase initialization error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to Firebase. Using demo mode.",
          variant: "destructive",
        });
      }
    };

    initFirebase();
  }, []);

  // Setup Firestore listeners
  const setupListeners = (dbInstance: any, uid: string, appId: string) => {
    const basePath = `artifacts/${appId}/users/${uid}`;

    // Transactions listener
    const transactionsRef = collection(dbInstance, `${basePath}/transactions`);
    const transactionsQuery = query(transactionsRef, orderBy("timestamp", "desc"));
    onSnapshot(transactionsQuery, (snapshot) => {
      const txns: Transaction[] = [];
      snapshot.forEach((doc) => {
        txns.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(txns);
    });

    // Subscriptions listener
    const subscriptionsRef = collection(dbInstance, `${basePath}/subscriptions`);
    onSnapshot(subscriptionsRef, (snapshot) => {
      const subs: Subscription[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        subs.push({
          id: doc.id,
          name: data.name,
          cost: data.cost,
          renewalDate: data.renewalDate.toDate(),
        });
      });
      setSubscriptions(subs);
    });

    // Rewards listener
    const rewardsRef = doc(dbInstance, `${basePath}/rewards/data`);
    onSnapshot(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRewards({
          points: data.points || 0,
          streak: data.streak || 0,
          lastUpdate: data.lastUpdate?.toDate() || new Date(),
        });
      }
    });
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
    if (!amount || !description || !db || !userId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const appId = window.__app_id || "finzen-app";
      const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
      
      await addDoc(transactionsRef, {
        amount: parseFloat(amount),
        description,
        type: transactionType,
        category: transactionType === "income" ? "Income" : getCategory(description),
        timestamp: Timestamp.now(),
      });

      // Update streak and rewards
      await updateStreak();

      setAmount("");
      setDescription("");
      
      toast({
        title: "Transaction Added",
        description: `${transactionType === "income" ? "Income" : "Expense"} of Z${amount} recorded`,
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  // Add subscription
  const handleAddSubscription = async () => {
    if (!subName || !subCost || !subDate || !db || !userId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all subscription fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const appId = window.__app_id || "finzen-app";
      const subscriptionsRef = collection(db, `artifacts/${appId}/users/${userId}/subscriptions`);
      
      await addDoc(subscriptionsRef, {
        name: subName,
        cost: parseFloat(subCost),
        renewalDate: Timestamp.fromDate(new Date(subDate)),
      });

      setSubName("");
      setSubCost("");
      setSubDate("");
      
      toast({
        title: "Subscription Added",
        description: `${subName} subscription tracked successfully`,
      });
    } catch (error) {
      console.error("Error adding subscription:", error);
      toast({
        title: "Error",
        description: "Failed to add subscription",
        variant: "destructive",
      });
    }
  };

  // Update streak logic
  const updateStreak = async () => {
    if (!db || !userId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastUpdate = new Date(rewards.lastUpdate);
      lastUpdate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 1) {
        const dailyBalance = calculateDailyBalance();
        const newStreak = dailyBalance >= 0 ? rewards.streak + 1 : 0;
        const newPoints = dailyBalance >= 0 ? rewards.points + 10 : rewards.points;

        const appId = window.__app_id || "finzen-app";
        const rewardsRef = doc(db, `artifacts/${appId}/users/${userId}/rewards/data`);
        
        await setDoc(rewardsRef, {
          points: newPoints,
          streak: newStreak,
          lastUpdate: Timestamp.now(),
        });
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
      const txnDate = t.timestamp.toDate();
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
      const daysDiff = (Date.now() - t.timestamp.toMillis()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7 && t.type === "expense";
    });

    const last7DaysExpense = last7Days.reduce((sum, t) => sum + t.amount, 0);
    
    const olderTransactions = transactions.filter((t) => {
      const daysDiff = (Date.now() - t.timestamp.toMillis()) / (1000 * 60 * 60 * 24);
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
        (sub.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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

  // Get AI advice with exponential backoff
  const getAIAdvice = async (retries = 3) => {
    setLoadingAI(true);
    setAiAdvice("");

    const balance = calculateBalance();
    const totalExpense = calculateTotalExpense();
    const topCategories = getCategoryBreakdown().slice(0, 3);

    const prompt = `You are a non-judgmental financial coach. Based on this user data:
    - Current Balance: Z${balance.toFixed(2)}
    - Total Expenses: Z${totalExpense.toFixed(2)}
    - Savings Streak: ${rewards.streak} days
    - Top Expense Categories: ${topCategories.map(([cat, amt]) => `${cat} (Z${amt})`).join(", ")}
    
    Provide concise, actionable financial advice in 3-4 sentences.`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyDSh31QTfN0p5fNxPTXF-l32xH8gkPZt6M`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
              },
            }),
          }
        );

        if (!response.ok) throw new Error("API request failed");

        const data = await response.json();
        const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate advice at this time.";
        
        setAiAdvice(advice);
        setLoadingAI(false);
        return;
      } catch (error) {
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          console.error("AI advice error:", error);
          toast({
            title: "AI Error",
            description: "Unable to fetch personalized advice. Please try again later.",
            variant: "destructive",
          });
        }
      }
    }
    setLoadingAI(false);
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
              <Badge variant="secondary" className="text-xs">
                User: {userId.slice(0, 8)}...
              </Badge>
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
                        {sub.name} (Z{sub.cost}) renews on {sub.renewalDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dashboard Cards */}
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Breakdown */}
          <Card className="shadow-md">
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
                    (sub.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
                            Renews: {sub.renewalDate.toLocaleDateString()}
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
                      {txn.timestamp.toDate().toLocaleDateString()}
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
