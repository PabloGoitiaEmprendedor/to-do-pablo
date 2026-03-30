-- Add missing columns to categories table
-- Fecha: 2026-03-30

-- Add icon column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN icon TEXT;
    RAISE NOTICE 'Added icon column to categories table';
  ELSE
    RAISE NOTICE 'icon column already exists in categories table';
  END IF;
END $$;

-- Add sort_order column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added sort_order column to categories table';
  ELSE
    RAISE NOTICE 'sort_order column already exists in categories table';
  END IF;
END $$;

-- Update existing rows to have sort_order = 0 if null (shouldn't be needed with NOT NULL DEFAULT, but just in case)
UPDATE public.categories SET sort_order = 0 WHERE sort_order IS NULL;

-- Recreate policies since we altered the table
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
CREATE POLICY "Allow all access to categories" ON public.categories
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Readd to publication (this might need to be done via Supabase dashboard or CLI)
-- For now, we'll note that the publication needs to be updated manually if not auto-updated