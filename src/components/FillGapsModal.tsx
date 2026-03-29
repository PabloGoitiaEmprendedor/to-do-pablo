import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock } from 'lucide-react';
import { DbTask, useDbTasks, useTimeBlocks } from '@/hooks/useSupabaseTasks';
import { format } from 'date-fns';

interface FillGapsModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
}

export function FillGapsModal({ open, onClose, date }: FillGapsModalProps) {
  const { tasks, updateTask } = useDbTasks();
  const { blocks } = useTimeBlocks();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const blockGaps = useMemo(() => {
    return blocks.map(block => {
      const [bh, bm] = block.start_time.split(':').map(Number);
      const [eh, em] = block.end_time.split(':').map(Number);
      const dur = (eh * 60 + em) - (bh * 60 + bm);
      return { block, totalMinutes: dur };
    });
  }, [blocks]);

  const totalAvailableMinutes = useMemo(() => {
    return blockGaps.reduce((acc, b) => acc + b.totalMinutes, 0);
  }, [blockGaps]);

  const availableTasks = useMemo(() => {
    return tasks
      .filter(t => 
        t.priority === 'optional' && 
        t.status === 'pending' && 
        (!t.block_id || t.date !== date) &&
        !t.parent_task_id
      )
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
  }, [tasks, date]);

  const usedMinutes = useMemo(() => {
    return tasks
      .filter(t => t.date === date && t.block_id && t.status !== 'completed')
      .reduce((acc, t) => acc + t.duration_minutes, 0);
  }, [tasks, date]);

  const remainingMinutes = totalAvailableMinutes - usedMinutes;

  const selectedMinutes = useMemo(() => {
    return availableTasks
      .filter(t => selectedTasks.has(t.id))
      .reduce((acc, t) => acc + t.duration_minutes, 0);
  }, [availableTasks, selectedTasks]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const selectedTasksArray = availableTasks.filter(t => selectedTasks.has(t.id));
    let currentTime = usedMinutes;
    let availableBlocks = [...blockGaps].sort((a, b) => a.block.start_time.localeCompare(b.block.start_time));

    for (const task of selectedTasksArray) {
      if (task.duration_minutes > remainingMinutes - selectedMinutes + task.duration_minutes) continue;
      
      for (const gap of availableBlocks) {
        const [bh, bm] = gap.block.start_time.split(':').map(Number);
        const [eh, em] = gap.block.end_time.split(':').map(Number);
        const gapDur = (eh * 60 + em) - (bh * 60 + bm);
        const usedInGap = tasks
          .filter(t => t.block_id === gap.block.id && t.date === date)
          .reduce((acc, t) => acc + t.duration_minutes, 0);
        const freeInGap = gapDur - usedInGap;

        if (freeInGap >= task.duration_minutes) {
          await updateTask(task.id, { block_id: gap.block.id, date });
          break;
        }
      }
    }

    setSelectedTasks(new Set());
    onClose();
  };

  const priorityColors: Record<string, string> = {
    '20': 'bg-red-500',
    '70': 'bg-yellow-500',
    '10': 'bg-blue-500',
    'optional': 'bg-gray-500',
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Llenar Huecos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona tareas para agregar al día
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tiempo disponible:</span>
              <span className={`font-mono font-semibold ${remainingMinutes - selectedMinutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remainingMinutes - selectedMinutes >= 0 ? '+' : ''}{remainingMinutes - selectedMinutes}m
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, ((remainingMinutes - selectedMinutes) / totalAvailableMinutes) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {availableTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay tareas pendientes disponibles</p>
              </div>
            ) : (
              availableTasks.map((task) => {
                const isSelected = selectedTasks.has(task.id);
                const willFit = remainingMinutes - selectedMinutes + task.duration_minutes >= task.duration_minutes;
                
                return (
                  <motion.button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-secondary/50 border border-transparent hover:bg-secondary'
                    } ${!willFit && !isSelected ? 'opacity-40' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`} />
                        <span className="text-[10px] text-muted-foreground">
                          {task.date ? format(new Date(task.date), 'dd MMM') : 'Sin fecha'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{task.duration_minutes}m</span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-muted-foreground">Tareas seleccionadas:</span>
              <span className="font-mono font-semibold">{selectedTasks.size} ({selectedMinutes}m)</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={selectedTasks.size === 0}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar ({selectedTasks.size} tareas)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
