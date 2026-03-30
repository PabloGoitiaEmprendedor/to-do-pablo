-- Fix: Remove updated_at column from categories table to match DbCategory interface
-- Fecha: 2026-03-30

-- First, check if updated_at column exists and remove it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.categories DROP COLUMN updated_at;
    RAISE NOTICE 'Removed updated_at column from categories table';
  ELSE
    RAISE NOTICE 'updated_at column does not exist in categories table';
  END IF;
END $$;

-- Recreate policies since we altered the table
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
CREATE POLICY "Allow all access to categories" ON public.categories
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Readd to publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_logs;