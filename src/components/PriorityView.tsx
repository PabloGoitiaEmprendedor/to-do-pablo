import { useAllTasks, useTimeBlocks } from '@/hooks/useSupabaseTasks';
import { Check, X, Clock, ExternalLink, RotateCcw, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useThemeStore } from '@/store/themeStore';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface PriorityViewProps {
  priority: '20' | '70' | '10' | 'optional';
  recurring?: boolean;
}

const DEFAULT_LABELS: Record<string, string> = {
  '20': 'Task 20%',
  '70': 'Task 70%',
  '10': 'Task 10%',
  optional: 'Opcionales',
};

export function PriorityView({ priority, recurring = false }: PriorityViewProps) {
  const { tasks, loading, refetch } = useAllTasks();
  const { blocks } = useTimeBlocks();

  const blockName = blocks.find(b => b.priority === priority)?.name || DEFAULT_LABELS[priority];
  const blockColor = blocks.find(b => b.priority === priority)?.color || '#888';

  const filtered = tasks.filter((t) => t.priority === priority);
  const displayTasks = recurring 
    ? filtered.filter(t => t.recurrence_kind !== 'none')
    : filtered.filter(t => t.recurrence_kind === 'none');

  const handleComplete = async (id: string) => {
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', id);
    refetch();
  };

  const handleFail = async (id: string) => {
    await supabase.from('tasks').update({ status: 'failed' }).eq('id', id);
    refetch();
  };

  const pending = displayTasks.filter(t => t.status === 'pending');
  const completed = displayTasks.filter(t => t.status === 'completed');

  const renderTask = (task: typeof displayTasks[0], showDate = true) => (
    <div 
      key={task.id} 
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 transition-all ${
        task.status === 'completed' ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={() => task.status === 'pending' && handleComplete(task.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          task.status === 'completed' 
            ? 'border-green-500 bg-green-500' 
            : task.status === 'failed'
            ? 'border-red-500 bg-red-500/20'
            : 'border-muted-foreground/30 hover:border-green-500/50'
        }`}
      >
        {task.status === 'completed' && <Check className="w-3.5 h-3.5 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.name}
        </p>
        <div className="flex items-center gap-2 mt-1 opacity-60">
          {showDate && task.date && (
            <span className="text-[10px] font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.date), 'dd MMM')}
            </span>
          )}
          {task.recurrence_kind !== 'none' && (
            <span className="text-[10px] font-mono flex items-center gap-1 text-primary">
              <RotateCcw className="w-3 h-3" />
              Recurrente
            </span>
          )}
          <span className="text-[10px] font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.duration_minutes}m
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.link && (
          <a 
            href={task.link} 
            target="_blank" 
            rel="noopener" 
            className="p-2 rounded-xl hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        )}
        {task.status === 'pending' && (
          <button 
            onClick={() => handleFail(task.id)}
            className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-5 border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: blockColor }}
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {blockName}
              {recurring && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">(Recurrente)</span>
              )}
            </h1>
            <span className="text-xs text-muted-foreground">
              {pending.length} pendientes · {completed.length} completadas
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && displayTasks.length === 0 && (
          <div className="text-center py-16">
            <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-muted`}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: blockColor }} />
            </div>
            <p className="text-sm text-muted-foreground">Sin tareas en este apartado</p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pendientes
              </h2>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="space-y-2">
              {pending.map(task => renderTask(task))}
            </div>
          </div>
        )}

        {!loading && completed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-4 border-t border-border/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completadas
              </h2>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="space-y-2">
              {completed.map(task => renderTask(task))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
