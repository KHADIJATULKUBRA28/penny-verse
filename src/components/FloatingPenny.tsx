import { useState } from "react";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const FloatingPenny = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenChat = () => {
    navigate("/ai-assistant");
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 right-6 z-50 w-16 h-16 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          "flex items-center justify-center"
        )}
        size="icon"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
      </Button>

      {/* Quick Insight Card */}
      {isOpen && (
        <Card className="fixed bottom-44 right-6 z-40 w-72 p-4 shadow-xl animate-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Hi! I'm Penny 👋</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Your AI financial coach. I can help you save smarter and achieve your goals!
              </p>
              <Button onClick={handleOpenChat} size="sm" className="w-full">
                Chat with Penny
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default FloatingPenny;
