import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Target, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  emoji: string;
  completed_at: string | null;
}

interface SavingsGoalProps {
  goals: SavingsGoal[];
  onAddGoal: (goal: { title: string; target_amount: number; deadline: string; emoji: string }) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoal: (id: string, amount: number) => void;
}

const EMOJI_OPTIONS = ["🎯", "📱", "✈️", "🏠", "🚗", "💍", "🎓", "💰", "🏖️", "🎮"];

const SavingsGoal = ({ goals, onAddGoal, onDeleteGoal, onUpdateGoal }: SavingsGoalProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState<Date>();
  const [selectedEmoji, setSelectedEmoji] = useState("🎯");
  const [addAmount, setAddAmount] = useState<{ [key: string]: string }>({});

  const handleAddGoal = () => {
    if (!title || !targetAmount || !deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    onAddGoal({
      title,
      target_amount: parseFloat(targetAmount),
      deadline: deadline.toISOString(),
      emoji: selectedEmoji,
    });

    setTitle("");
    setTargetAmount("");
    setDeadline(undefined);
    setSelectedEmoji("🎯");
    setOpen(false);
  };

  const handleAddToGoal = (goalId: string) => {
    const amount = parseFloat(addAmount[goalId] || "0");
    if (amount <= 0) return;

    onUpdateGoal(goalId, amount);
    setAddAmount({ ...addAmount, [goalId]: "" });
  };

  const calculateDailySavings = (goal: SavingsGoal) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const remaining = goal.target_amount - goal.current_amount;
    return daysLeft > 0 ? (remaining / daysLeft).toFixed(2) : "0.00";
  };

  const getMotivationalMessage = (progress: number) => {
    if (progress >= 100) return "🎉 Goal achieved! Amazing work!";
    if (progress >= 80) return "🔥 You're 80% there! Keep going!";
    if (progress >= 50) return "💪 Halfway there! You're doing great!";
    if (progress >= 25) return "🌟 Great start! Keep building momentum!";
    return "🚀 Every journey starts with a single step!";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Savings Goals
            </CardTitle>
            <CardDescription>Track and achieve your financial dreams</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Savings Goal</DialogTitle>
                <DialogDescription>Set a goal and watch your progress grow</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Choose an emoji</label>
                  <div className="flex gap-2 flex-wrap">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={selectedEmoji === emoji ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedEmoji(emoji)}
                        className="text-xl"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Goal title (e.g., 'New Phone')"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Target amount (Zcoins)"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : <span>Pick deadline</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={handleAddGoal} className="w-full">
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No goals yet. Create your first savings goal to get started!
          </p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              const dailySavings = calculateDailySavings(goal);
              const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{goal.emoji}</span>
                      <div>
                        <h4 className="font-semibold">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {daysLeft} days left · Save Z{dailySavings}/day
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteGoal(goal.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Z{goal.current_amount.toFixed(2)}</span>
                      <span className="text-muted-foreground">Z{goal.target_amount.toFixed(2)}</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-xs font-medium text-center">{progress.toFixed(0)}%</p>
                  </div>

                  <p className="text-xs text-center text-muted-foreground italic">
                    {getMotivationalMessage(progress)}
                  </p>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Add amount"
                      value={addAmount[goal.id] || ""}
                      onChange={(e) => setAddAmount({ ...addAmount, [goal.id]: e.target.value })}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleAddToGoal(goal.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsGoal;
