import { useAllTasks } from '@/hooks/useSupabaseTasks';
import { Check, X, Clock, ExternalLink, ChevronRight, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useThemeStore } from '@/store/themeStore';

interface PriorityViewProps {
  priority: '20' | '70' | '10' | 'optional';
}

const DEFAULT_LABELS: Record<string, string> = {
  '20': '20% Esencial',
  '70': '70% Expansión',
  '10': '10% Soporte',
  optional: 'Opcional',
};

export function PriorityView({ priority }: PriorityViewProps) {
  const { tasks, loading, refetch } = useAllTasks();
  const { priorityNames } = useThemeStore();
  const filtered = tasks.filter((t) => t.priority === priority);

  const handleComplete = async (id: string) => {
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', id);
    refetch();
  };

  const handleFail = async (id: string) => {
    await supabase.from('tasks').update({ status: 'failed' }).eq('id', id);
    refetch();
  };

  const pending = filtered.filter(t => t.status === 'pending');
  const completed = filtered.filter(t => t.status === 'completed');

  const grouped = filtered.reduce((acc, task) => {
    let cat = 'Sin Categoría';
    if (task.description) {
      if (task.description.includes(':')) {
        cat = task.description.split(':')[0].trim();
      } else {
        cat = task.description.trim();
      }
    }
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const categories = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-md">
      <div className="px-6 py-5 border-b border-border bg-card/50">
        <h1 className="text-2xl font-bold tracking-tight">{priorityNames[priority] || DEFAULT_LABELS[priority]}</h1>
        <span className="text-xs text-muted-foreground">
          {pending.length} pendientes · {completed.length} completadas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading && <p className="text-muted-foreground text-sm">Cargando...</p>}
        {!loading && filtered.length === 0 && <p className="text-muted-foreground text-sm font-medium">Sin tareas en este apartado</p>}

        {categories.map(cat => (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Folder className="w-4 h-4 text-primary/70" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">{cat}</h3>
              <div className="h-px bg-border flex-1 ml-4" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {grouped[cat].map((task) => (
                <div key={task.id} className={`group flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all shadow-sm ${task.status === 'completed' ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold tracking-tight truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 opacity-70">
                      {task.date && <span className="text-[10px] font-mono tracking-widest uppercase">{task.date}</span>}
                      {task.duration_minutes > 0 && (
                        <span className="text-[10px] font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />{task.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  {task.status === 'pending' && (
                    <div className="flex gap-1.5 flex-col sm:flex-row shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleComplete(task.id)} className="p-2 rounded-xl hover:bg-green-500/10 hover:text-green-500 transition-colors bg-secondary">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleFail(task.id)} className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors bg-secondary">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {task.link && (
                    <a href={task.link} target="_blank" rel="noopener" className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0 bg-secondary">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
