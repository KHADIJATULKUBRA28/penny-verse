import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ExpensePieChart from "@/components/ExpensePieChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Insights = () => {
  const navigate = useNavigate();
  const [categoryBreakdown, setCategoryBreakdown] = useState<[string, number][]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchAnalytics();
    };

    checkAuth();
  }, [navigate]);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id);

    if (transactions) {
      // Calculate expenses by category
      const expensesByCategory: Record<string, number> = {};
      let expenses = 0;
      let income = 0;

      transactions.forEach((t) => {
        if (t.type === "expense") {
          expenses += t.amount;
          expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        } else {
          income += t.amount;
        }
      });

      setCategoryBreakdown(Object.entries(expensesByCategory));
      setTotalExpenses(expenses);
      setTotalIncome(income);

      // Generate insights
      const newInsights = [];
      const balance = income - expenses;
      if (balance > 0) {
        newInsights.push(`You saved ${balance.toFixed(2)} PP this period! 🎉`);
      } else {
        newInsights.push(`You spent ${Math.abs(balance).toFixed(2)} PP more than you earned.`);
      }

      const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        newInsights.push(`Your top spending category is ${topCategory[0]} (${topCategory[1].toFixed(2)} PP).`);
      }

      setInsights(newInsights);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Insights & Analytics</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{totalIncome.toFixed(2)} PP</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{totalExpenses.toFixed(2)} PP</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive"}`}>
              {(totalIncome - totalExpenses).toFixed(2)} PP
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Smart analysis of your spending habits</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <ExpensePieChart categoryBreakdown={categoryBreakdown} />
      </div>
      <BottomNav />
    </div>
  );
};

export default Insights;
