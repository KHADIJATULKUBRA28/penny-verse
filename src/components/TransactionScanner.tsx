import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionScannerProps {
  onTransaction: (amount: string, description: string, type: "income" | "expense") => void;
}

const TransactionScanner = ({ onTransaction }: TransactionScannerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handlePhoneTransaction = () => {
    if (!phoneNumber || !amount) {
      toast({
        title: "Missing Information",
        description: "Please enter phone number and amount",
        variant: "destructive",
      });
      return;
    }
    
    onTransaction(amount, description || `Payment to ${phoneNumber}`, "expense");
    setOpen(false);
    setPhoneNumber("");
    setAmount("");
    setDescription("");
  };

  const handleQRScan = () => {
    // Simulate QR code scan - in a real app, this would use device camera
    toast({
      title: "QR Scanner",
      description: "QR scanning requires camera access. Use phone number method for now.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <QrCode className="w-4 h-4 mr-2" />
          UPI Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make UPI Payment</DialogTitle>
          <DialogDescription>Choose your payment method</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="phone" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone">
              <Phone className="w-4 h-4 mr-2" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="phone" className="space-y-4">
            <Input
              type="tel"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Amount (Zcoins)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button onClick={handlePhoneTransaction} className="w-full">
              Send Payment
            </Button>
          </TabsContent>
          <TabsContent value="qr" className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                QR code scanner would appear here
              </p>
              <Button onClick={handleQRScan}>
                Scan QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionScanner;