import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DbTask {
  id: string;
  name: string;
  date: string | null;
  start_time: string;
  duration_minutes: number;
  priority: '20' | '70' | '10' | 'optional';
  status: 'pending' | 'completed' | 'failed' | 'rescheduled';
  link: string | null;
  description: string | null;
  recurrence_kind: string;
  recurrence_config: Record<string, any>;
  block_id: string | null;
  parent_task_id: string | null;
  notion_source: boolean;
  sort_order: number;
  category_id: string | null;
  created_at: string;
}

export interface DbTimeBlock {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  priority: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DailyTaskLog {
  id: string;
  task_id: string;
  date: string;
  status: 'pending' | 'completed' | 'failed' | 'rescheduled';
  completed_at: string | null;
}

export function useTimeBlocks() {
  const [blocks, setBlocks] = useState<DbTimeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocks = useCallback(async () => {
    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (!error && data) setBlocks(data as DbTimeBlock[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlocks();
    const channel = supabase
      .channel('time_blocks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_blocks' }, () => fetchBlocks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBlocks]);

  const updateBlock = async (id: string, updates: Partial<DbTimeBlock>) => {
    await supabase.from('time_blocks').update(updates).eq('id', id);
    fetchBlocks();
  };

  const addBlock = async (block: Omit<DbTimeBlock, 'id' | 'created_at'>) => {
    await supabase.from('time_blocks').insert(block);
    fetchBlocks();
  };

  const deleteBlock = async (id: string) => {
    await supabase.from('time_blocks').delete().eq('id', id);
    fetchBlocks();
  };

  return { blocks, loading, updateBlock, addBlock, deleteBlock, refetch: fetchBlocks };
}

export function useCategories() {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (!error && data) setCategories(data as DbCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
    const channel = supabase
      .channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchCategories())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCategories]);

  const addCategory = async (category: Omit<DbCategory, 'id' | 'created_at'>) => {
    await supabase.from('categories').insert(category);
    fetchCategories();
  };

const updateCategory = async (id: string, updates: Partial<DbCategory>) => {
  await supabase.from('categories').update(updates).eq('id', id);
  fetchCategories();
};

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetchCategories };
}

export function useDailyTaskLogs(date: string) {
  const [logs, setLogs] = useState<DailyTaskLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('daily_task_logs')
      .select('*')
      .eq('date', date);
    if (!error && data) setLogs(data as DailyTaskLog[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel(`daily_logs_${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_task_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, date]);

  const getTaskStatusForDate = (taskId: string): 'pending' | 'completed' | 'failed' | 'rescheduled' => {
    const log = logs.find(l => l.task_id === taskId);
    return log?.status || 'pending';
  };

  const setTaskStatusForDate = async (taskId: string, status: 'completed' | 'failed' | 'pending') => {
    if (status === 'pending') {
      await supabase.from('daily_task_logs').delete().eq('task_id', taskId).eq('date', date);
    } else {
      await supabase.from('daily_task_logs').upsert({
        task_id: taskId,
        date,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      }, { onConflict: 'task_id,date' });
    }
    fetchLogs();
  };

  return { logs, loading, getTaskStatusForDate, setTaskStatusForDate, refetch: fetchLogs };
}

export function useDbTasks(date?: string) {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyTaskLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    let query = supabase.from('tasks').select('*').order('start_time');
    if (date) {
      query = query.or(`date.eq.${date},recurrence_kind.neq.none`);
    }
    const { data, error } = await query;
    if (!error && data) setTasks(data as DbTask[]);
    setLoading(false);
  }, [date]);

  const fetchDailyLogs = useCallback(async () => {
    if (!date) {
      setDailyLogs([]);
      return;
    }
    const { data, error } = await supabase
      .from('daily_task_logs')
      .select('*')
      .eq('date', date);
    if (!error && data) setDailyLogs(data as DailyTaskLog[]);
  }, [date]);

  useEffect(() => {
    fetchTasks();
    fetchDailyLogs();
    const channel = supabase
      .channel(`tasks_${date || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_task_logs' }, () => fetchDailyLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks, fetchDailyLogs]);

  const addTask = async (task: Omit<DbTask, 'id' | 'created_at' | 'notion_source'>) => {
    await supabase.from('tasks').insert({ ...task, notion_source: false });
    fetchTasks();
  };

  const updateTask = async (id: string, updates: Partial<DbTask>) => {
    await supabase.from('tasks').update(updates).eq('id', id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  const getEffectiveStatus = (taskId: string, originalStatus: string): string => {
    const log = dailyLogs.find(l => l.task_id === taskId);
    return log?.status || originalStatus || 'pending';
  };

  const completeTask = async (id: string) => {
    if (date) {
      await supabase.from('daily_task_logs').upsert({
        task_id: id,
        date,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'task_id,date' });
    } else {
      await updateTask(id, { status: 'completed' });
    }
    fetchDailyLogs();
  };

  const failTask = async (id: string) => {
    if (date) {
      await supabase.from('daily_task_logs').upsert({
        task_id: id,
        date,
        status: 'failed',
      }, { onConflict: 'task_id,date' });
    } else {
      await updateTask(id, { status: 'failed' });
    }
    fetchDailyLogs();
  };

  const resetTask = async (id: string) => {
    if (date) {
      await supabase.from('daily_task_logs').delete().eq('task_id', id).eq('date', date);
    } else {
      await updateTask(id, { status: 'pending' });
    }
    fetchDailyLogs();
  };

  return { tasks, loading, addTask, updateTask, deleteTask, completeTask, failTask, resetTask, getEffectiveStatus, refetch: fetchTasks };
}

export function useAllTasks() {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('date').order('start_time');
    if (!error && data) setTasks(data as DbTask[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}
