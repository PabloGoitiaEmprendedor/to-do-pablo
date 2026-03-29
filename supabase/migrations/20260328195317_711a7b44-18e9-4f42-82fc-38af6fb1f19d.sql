
CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  habit_name text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date, habit_name)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to habit_logs" ON public.habit_logs FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to mood_logs" ON public.mood_logs FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_logs;
