import { useState } from 'react';
import { useAllTasks, useDbTasks } from '@/hooks/useSupabaseTasks';
import { Check, Clock, AlertCircle, ArrowUpRight, Zap, Target, Trash2, Import } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useThemeStore } from '@/store/themeStore';

const NOTION_TASKS = [
  { name: 'Implementa reuniones semanales feedback', priority: 'optional', description: 'Negocio: Feedback y reconocimiento' },
  { name: 'Cultura agresiva (definition)', priority: 'optional', description: 'Negocio: Cultura organizacional' },
  { name: 'Libertad > Plata (feedback loop)', priority: 'optional', description: 'Negocio: Motivación equipo' },
  { name: 'Personas valerosas (mentorship)', priority: 'optional', description: 'Negocio: Outreach' },
  { name: 'Contrataciones y cofunders YC', priority: 'optional', description: 'Negocio: Equipo' },
  { name: 'Growth Loops ESCALAR', priority: 'optional', description: 'Negocio: Escalamiento' },
  { name: 'Vesting cuando tenga equipo', priority: 'optional', description: 'Negocio: Estructura' },
  { name: 'Estrategias retención Adonai', priority: 'optional', description: 'Negocio: Producto' },
  { name: 'Comunidad de impacto', priority: 'optional', description: 'Negocio: Comunidad' },
  { name: 'Diario de Liderazgo', priority: 'optional', description: 'Negocio: Liderazgo' },
  { name: 'Actividades team building', priority: 'optional', description: 'Negocio: Equipo' },
  { name: 'Cultura de "fail fast"', priority: 'optional', description: 'Negocio: Cultura' },
  { name: 'Pide feedback regularmente', priority: 'optional', description: 'Negocio: Mejora continua' },
  { name: 'Referentes: Daniel Bilbao', priority: 'optional', description: 'Investigación: Referentes' },
  { name: 'Referentes: Andres Bilbao', priority: 'optional', description: 'Investigación: Referentes' },
  { name: 'Referentes: Manuela Villegas', priority: 'optional', description: 'Investigación: Referentes' },
  { name: 'Referentes: Caro Dubiansky', priority: 'optional', description: 'Investigación: Referentes' },
];

export function EisenhowerMatrix() {
  const { tasks, loading, refetch } = useAllTasks();
  const { addTask } = useDbTasks();
  const { priorityNames } = useThemeStore();
  const [viewMode, setViewMode] = useState<'energy' | 'theory'>('energy');

  const handleSeed = async () => {
    try {
      for (const t of NOTION_TASKS) {
        await addTask({
          name: t.name,
          priority: t.priority as any,
          description: t.description,
          date: null as any, // No date for backlog tasks
          start_time: '09:00',
          duration_minutes: 30,
          status: 'pending',
          link: null,
          recurrence_kind: 'none',
          recurrence_config: {},
          block_id: null,
          parent_task_id: null,
          sort_order: 0
        });
      }
      toast.success('Tareas de Notion importadas correctamente');
      refetch();
    } catch (e) {
      toast.error('Error al importar tareas');
    }
  };

  const quadrants = {
    do: tasks.filter(t => t.priority === '20'),
    schedule: tasks.filter(t => t.priority === '70'),
    delegate: tasks.filter(t => t.priority === '10'),
    delete: tasks.filter(t => t.priority === 'optional'),
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando matriz...</div>;

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-md p-4 lg:p-6 space-y-6 overflow-y-auto">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matriz de Eisenhower</h1>
          <p className="text-muted-foreground text-sm">Priorización automática de tus tareas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary/50 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setViewMode('energy')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'energy' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              Energía
            </button>
            <button 
              onClick={() => setViewMode('theory')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'theory' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              Teoría
            </button>
          </div>
          <button
            onClick={handleSeed}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-xs font-medium"
          >
            <Import className="w-3.5 h-3.5" /> Importar Notion
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <Quadrant
          title={viewMode === 'energy' ? (priorityNames['20'] || "20% Esencial") : "1. Hazlo Ahora"}
          subtitle={viewMode === 'energy' ? "Crítico e Inmediato" : "Urgente / Importante"}
          tasks={quadrants.do}
          icon={FlameIcon}
          color="rgba(180, 70, 30, 0.05)"
          borderColor="var(--priority-20)"
        />
        <Quadrant
          title={viewMode === 'energy' ? (priorityNames['70'] || "70% Expansión") : "2. Planifica"}
          subtitle={viewMode === 'energy' ? "Crecimiento de Sistemas" : "No Urgente / Importante"}
          tasks={quadrants.schedule}
          icon={Target}
          color="rgba(50, 100, 180, 0.05)"
          borderColor="var(--priority-70)"
        />
        <Quadrant
          title={viewMode === 'energy' ? (priorityNames['10'] || "10% Soporte") : "3. Delega"}
          subtitle={viewMode === 'energy' ? "Mantenimiento Diario" : "Urgente / No Importante"}
          tasks={quadrants.delegate}
          icon={Zap}
          color="rgba(180, 150, 30, 0.05)"
          borderColor="var(--priority-10)"
        />
        <Quadrant
          title={viewMode === 'energy' ? (priorityNames.optional || "Opcional") : "4. Elimina"}
          subtitle={viewMode === 'energy' ? "Exploración y Ocio" : "No Urgente / No Importante"}
          tasks={quadrants.delete}
          icon={Trash2}
          color="rgba(120, 70, 150, 0.05)"
          borderColor="var(--priority-optional)"
        />
      </div>
    </div>
  );
}

function FlameIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 3.5 3 5 .612.918 1 2.235 1 3.5a5.5 5.5 0 0 1-11 0c0-1.465.343-2.617 1-3.5 1.5 1.5 1.5 4-1 5Z" />
    </svg>
  );
}

function Quadrant({ title, subtitle, tasks, icon: Icon, color, borderColor }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col rounded-2xl border p-4 bg-card/60 backdrop-blur-sm shadow-xl"
      style={{ 
        backgroundColor: color, 
        borderColor: `hsla(${borderColor}, 0.3)` 
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Icon className="w-4 h-4" /> {title}
          </h2>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{subtitle}</p>
        </div>
        <div className="h-6 w-6 rounded-full bg-background/50 flex items-center justify-center text-xs font-mono">
          {tasks.length}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            className="group flex items-start gap-3 p-3 rounded-xl bg-background/40 border border-border/40 hover:border-primary/30 transition-all cursor-pointer"
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
              {task.status === 'completed' && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium leading-tight ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>{task.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {task.start_time}
                </span>
                {task.notion_source && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Notion</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground/40 italic text-xs">
            Sin tareas pendientes
          </div>
        )}
      </div>
    </motion.div>
  );
}
