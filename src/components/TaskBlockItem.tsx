import { motion } from 'framer-motion';
import { DbTask } from '@/hooks/useSupabaseTasks';
import { Check, X, RotateCcw } from 'lucide-react';

interface TaskBlockItemProps {
  task: DbTask;
  hourHeight: number;
  startHour: number;
  column: number;
  totalColumns: number;
  stackOffset: number;
  onSelect: (task: DbTask) => void;
  onComplete: (id: string) => void;
  onFail: (id: string) => void;
}

const GAP = 3; // px gap between events

export function TaskBlockItem({ task, hourHeight, startHour, column, totalColumns, stackOffset, onSelect, onComplete, onFail }: TaskBlockItemProps) {
  const [h, m] = task.start_time.split(':').map(Number);
  const startMinutes = (h - startHour) * 60 + m;
  const top = (startMinutes / 60) * hourHeight + stackOffset;
  const height = Math.max((task.duration_minutes / 60) * hourHeight - GAP, 24);

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  // Column layout for overlapping tasks
  const padding = 56; // left label width (3.5rem)
  const rightPad = 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: isCompleted || isFailed ? 0.4 : 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="task-block absolute z-10 rounded-lg cursor-pointer overflow-hidden border-l-[3px]"
      style={{
        top,
        height,
        left: totalColumns > 1
          ? `calc(${padding}px + ${(column / totalColumns) * 100}% - ${(column / totalColumns) * (padding + rightPad)}px)`
          : `${padding}px`,
        width: totalColumns > 1
          ? `calc(${100 / totalColumns}% - ${((padding + rightPad) / totalColumns)}px - ${GAP}px)`
          : `calc(100% - ${padding + rightPad}px)`,
        backgroundColor: `hsl(var(--priority-${task.priority === 'optional' ? 'optional' : task.priority}) / 0.82)`,
        borderLeftColor: `hsl(var(--priority-${task.priority === 'optional' ? 'optional' : task.priority}))`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task);
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-center overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          {task.recurrence_kind !== 'none' && (
            <RotateCcw className="w-2.5 h-2.5 text-foreground/60 shrink-0" />
          )}
          <span className={`text-[11px] font-medium text-foreground leading-tight truncate ${isCompleted ? 'line-through' : ''}`}>
            {task.name}
          </span>
        </div>

        {height > 44 && !isCompleted && !isFailed && (
          <div className="flex gap-1 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
              className="p-0.5 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
            >
              <Check className="w-3 h-3 text-green-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onFail(task.id); }}
              className="p-0.5 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
            >
              <X className="w-3 h-3 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
