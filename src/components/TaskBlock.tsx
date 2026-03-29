import { motion } from 'framer-motion';
import { Task } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { Check, X, RotateCcw, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface TaskBlockProps {
  task: Task;
  hourHeight: number;
  startHour: number;
}

const PRIORITY_BG: Record<string, string> = {
  '20': 'rgba(180, 70, 30, 0.85)',
  '70': 'rgba(50, 100, 180, 0.75)',
  '10': 'rgba(180, 150, 30, 0.7)',
  optional: 'rgba(120, 70, 150, 0.7)',
};

const PRIORITY_BORDER: Record<string, string> = {
  '20': 'rgba(220, 90, 40, 1)',
  '70': 'rgba(70, 130, 220, 1)',
  '10': 'rgba(220, 180, 40, 1)',
  optional: 'rgba(150, 90, 190, 1)',
};

export function TaskBlock({ task, hourHeight, startHour }: TaskBlockProps) {
  const { completeTask, failTask } = useTaskStore();
  const [showActions, setShowActions] = useState(false);

  const [h, m] = task.startTime.split(':').map(Number);
  const startMinutes = (h - startHour) * 60 + m;
  const top = (startMinutes / 60) * hourHeight;
  const height = Math.max((task.durationMinutes / 60) * hourHeight, 24);

  const endH = Math.floor((startMinutes + task.durationMinutes) / 60) + startHour;
  const endM = (startMinutes + task.durationMinutes) % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  const formatTime = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const period = hh < 12 ? 'AM' : 'PM';
    return `${hh % 12 || 12}:${mm.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isCompleted ? 0.5 : 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`task-block absolute left-14 right-2 z-10 rounded-md cursor-pointer overflow-hidden border-l-[3px] ${isCompleted ? 'line-through' : ''}`}
      style={{
        top,
        height,
        backgroundColor: PRIORITY_BG[task.priority],
        borderLeftColor: PRIORITY_BORDER[task.priority],
      }}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="px-2.5 py-1.5 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            {task.recurrence.kind !== 'none' && (
              <RotateCcw className="w-3 h-3 text-foreground/70 shrink-0" />
            )}
            <span className={`text-sm font-medium text-foreground leading-tight truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>
              {task.name}
            </span>
          </div>
          {height > 36 && (
            <span className="text-[11px] text-foreground/60 font-mono block mt-0.5">
              {formatTime(task.startTime)}–{formatTime(endTime)}
            </span>
          )}
        </div>

        {/* Quick actions */}
        {showActions && !isCompleted && !isFailed && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-1 mt-1"
          >
            <button
              onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
              className="p-1 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-green-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); failTask(task.id); }}
              className="p-1 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>
            {task.link && (
              <a
                href={task.link}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
