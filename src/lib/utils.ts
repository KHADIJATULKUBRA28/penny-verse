import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/lib/supabase"; 

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getNetBalance(): Promise<number> {
  const { data: transactions, error } = await supabase
    .from('transactions') 
    .select('amount, type');

  if (error) {
    console.error('Error fetching transactions:', error);
    return 0; 
  }

  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      totalExpense += transaction.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;
  return netBalance;
}
