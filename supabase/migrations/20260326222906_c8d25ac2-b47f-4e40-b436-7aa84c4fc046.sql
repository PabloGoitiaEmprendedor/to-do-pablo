
-- Categories for task organization
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT '70' CHECK (priority IN ('20', '70', '10', 'optional')),
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  priority TEXT NOT NULL DEFAULT '70' CHECK (priority IN ('20', '70', '10', 'optional')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rescheduled')),
  link TEXT,
  recurrence_kind TEXT NOT NULL DEFAULT 'none',
  recurrence_config JSONB DEFAULT '{}',
  block_id UUID,
  category_id UUID REFERENCES public.categories(id),
  notion_source BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time blocks for daily structure
CREATE TABLE public.time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  priority TEXT CHECK (priority IN ('20', '70', '10', 'optional', 'break', 'routine')),
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productivity logs for analytics
CREATE TABLE public.productivity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  deep_work_minutes INTEGER DEFAULT 0,
  total_planned_minutes INTEGER DEFAULT 0,
  priority_20_minutes INTEGER DEFAULT 0,
  priority_70_minutes INTEGER DEFAULT 0,
  priority_10_minutes INTEGER DEFAULT 0,
  optional_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Add foreign key for block_id after time_blocks exists
ALTER TABLE public.tasks ADD CONSTRAINT tasks_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.time_blocks(id);

-- RLS - public access for now (single user, no auth yet)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to time_blocks" ON public.time_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to productivity_logs" ON public.productivity_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_blocks;
