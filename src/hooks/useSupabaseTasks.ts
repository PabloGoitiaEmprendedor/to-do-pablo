import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DbTask {
  id: string;
  name: string;
  date: string;
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

export function useDbTasks(date?: string) {
  const [tasks, setTasks] = useState<DbTask[]>([]);
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

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel(`tasks_${date || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

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

  const completeTask = async (id: string) => updateTask(id, { status: 'completed' });
  const failTask = async (id: string) => updateTask(id, { status: 'failed' });

  return { tasks, loading, addTask, updateTask, deleteTask, completeTask, failTask, refetch: fetchTasks };
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
