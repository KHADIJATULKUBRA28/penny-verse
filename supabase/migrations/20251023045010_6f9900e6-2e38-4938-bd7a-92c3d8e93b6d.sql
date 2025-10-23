-- Add monthly_income to profiles table
ALTER TABLE public.profiles 
ADD COLUMN monthly_income NUMERIC DEFAULT 0;

-- Update rewards table to track bonus points from streaks
ALTER TABLE public.rewards
ADD COLUMN lifetime_points INTEGER DEFAULT 0;