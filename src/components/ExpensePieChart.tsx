import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface ExpensePieChartProps {
  categoryBreakdown: [string, number][];
}

const COLORS = {
  "Food & Dining": "hsl(var(--chart-1))",
  "Travel": "hsl(var(--chart-2))",
  "Shopping": "hsl(var(--chart-3))",
  "Subscriptions": "hsl(var(--chart-4))",
  "Bills": "hsl(var(--chart-5))",
  "Income": "hsl(var(--primary))",
  "General Expense": "hsl(var(--muted))",
};

const ExpensePieChart = ({ categoryBreakdown }: ExpensePieChartProps) => {
  if (categoryBreakdown.length === 0) {
    return null;
  }

  const data = categoryBreakdown.map(([category, amount]) => ({
    name: category,
    value: amount,
    fill: COLORS[category as keyof typeof COLORS] || "hsl(var(--muted))",
  }));

  const total = categoryBreakdown.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          Expense Breakdown
        </CardTitle>
        <CardDescription>Where your money goes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `Z${value.toFixed(2)}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {categoryBreakdown.map(([category, amount]) => (
            <div key={category} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[category as keyof typeof COLORS] || "hsl(var(--muted))" }}
                />
                <span>{category}</span>
              </div>
              <span className="font-medium">
                Z{amount.toFixed(2)} ({((amount / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensePieChart;
