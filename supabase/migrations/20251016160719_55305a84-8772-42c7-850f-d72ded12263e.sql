-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  upi_id TEXT UNIQUE,
  wallet_balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, upi_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '@pennyverse'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create goal vaults table for locked savings
CREATE TABLE IF NOT EXISTS public.goal_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  saved_amount NUMERIC DEFAULT 0 NOT NULL,
  daily_save_amount NUMERIC NOT NULL,
  is_locked BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_save_date DATE,
  streak_days INTEGER DEFAULT 0 NOT NULL,
  is_broken BOOLEAN DEFAULT false NOT NULL,
  broken_at TIMESTAMP WITH TIME ZONE,
  emoji TEXT DEFAULT '🎯'
);

ALTER TABLE public.goal_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vaults"
  ON public.goal_vaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vaults"
  ON public.goal_vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vaults"
  ON public.goal_vaults FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vaults"
  ON public.goal_vaults FOR DELETE
  USING (auth.uid() = user_id);

-- Update transactions table to support UPI transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'manual';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS upi_ref_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS from_upi TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_upi TEXT;