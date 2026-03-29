-- Migración: Fix tareas tachadas por día + Sistema de Categorías
-- Fecha: 2026-03-29

-- Tabla para registrar el estado de cada tarea por día específico
CREATE TABLE public.daily_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rescheduled')),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, date)
);

ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_task_logs" ON public.daily_task_logs FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_logs;

-- Tabla de categorías
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#888888',
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

-- Agregar category_id a tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Agregar índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_task_date ON public.daily_task_logs(task_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category_id);
