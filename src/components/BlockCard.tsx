import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbTask, DbTimeBlock } from '@/hooks/useSupabaseTasks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface BlockCardProps {
  block: DbTimeBlock;
  tasks: DbTask[];
  allTasks: DbTask[];
  onTaskSelect: (task: DbTask) => void;
  onTaskComplete: (id: string) => void;
  onAddTask: () => void;
  onRescheduleClick: (task: DbTask) => void;
  subtaskIndicatorId?: string | null;
}

export const BlockCard = React.memo(function BlockCard({
  block,
  tasks,
  allTasks,
  onTaskSelect,
  onTaskComplete,
  onAddTask,
  onRescheduleClick,
  subtaskIndicatorId,
}: BlockCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const blockColor = block.color || '#888888';

  const { completedCount, totalCount, allCompleted, blockMinutes, usedMinutes, remainingMinutes } = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    
    const [bh, bm] = block.start_time.split(':').map(Number);
    const [eh, em] = block.end_time.split(':').map(Number);
    const bm_total = (eh * 60 + em) - (bh * 60 + bm);
    const used = tasks.reduce((s, t) => s + t.duration_minutes, 0);
    
    return {
      completedCount: completed,
      totalCount: total,
      allCompleted: total > 0 && completed === total,
      blockMinutes: bm_total,
      usedMinutes: used,
      remainingMinutes: bm_total - used,
    };
  }, [tasks, block.start_time, block.end_time]);

  const completionPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <div className="rounded-lg sm:rounded-2xl border border-border overflow-hidden">
      <div
        className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between cursor-pointer hover:bg-accent/20 transition-colors gap-1.5"
        style={{ backgroundColor: `${blockColor}15` }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <ChevronDown
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform shrink-0"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-[9px] sm:text-[11px] text-muted-foreground uppercase tracking-wider block">{block.name}</span>
            <span className="text-[8.5px] sm:text-[10px] text-muted-foreground whitespace-nowrap">
              {block.start_time} - {block.end_time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {totalCount > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <div className="w-6 sm:w-8 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: blockColor,
                  }}
                />
              </div>
              <span className="text-[8.5px] sm:text-[10px] text-muted-foreground w-5 sm:w-6 text-right">
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 space-y-1 sm:space-y-1.5 bg-card/50 border-t border-border"
          >
            {tasks.length === 0 ? (
              <button
                onClick={onAddTask}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-1 sm:py-1.5 rounded-lg text-muted-foreground hover:bg-accent/40 transition-colors text-[10px] sm:text-[12px]"
              >
                <Plus className="w-3 h-3" />
                Agregar tarea
              </button>
            ) : (
              <>
                {tasks.map((task) => (
                  <SortableTaskPill
                    key={task.id}
                    task={task}
                    blockColor={blockColor}
                    onSelect={onTaskSelect}
                    onComplete={onTaskComplete}
                    onRescheduleClick={onRescheduleClick}
                    isSubtaskTarget={subtaskIndicatorId === task.id}
                  />
                ))}
                <button
                  onClick={onAddTask}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1 rounded-lg text-muted-foreground hover:bg-accent/20 transition-colors text-[11px] mt-1"
                >
                  <Plus className="w-3 h-3" />
                  Agregar
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface SortableTaskPillProps {
  task: DbTask;
  blockColor: string;
  onSelect: (task: DbTask) => void;
  onComplete: (id: string) => void;
  onRescheduleClick: (task: DbTask) => void;
  isSubtaskTarget?: boolean;
  effectiveStatus?: string;
}

const SortableTaskPill = React.memo(function SortableTaskPill({
  task,
  blockColor,
  onSelect,
  onComplete,
  onRescheduleClick,
  isSubtaskTarget,
  effectiveStatus,
}: SortableTaskPillProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: { type: 'task', task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  // Use effectiveStatus from parent if provided (handles daily_task_logs correctly)
  const isCompleted = effectiveStatus === 'completed' || task.status === 'completed';

  const handleClick = () => {
    if (!isDragging) {
      onSelect(task);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${
          isCompleted ? 'bg-accent/30' : 'hover:bg-accent/20'
        } ${isSubtaskTarget ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id);
          }}
          className={`w-4.5 h-4.5 rounded-full border-2 shrink-0 transition-all flex items-center justify-center ${
            isCompleted
              ? 'border-primary bg-primary'
              : 'border-muted-foreground/40 hover:border-muted-foreground/70'
          }`}
          style={{
            backgroundColor: isCompleted ? blockColor : 'transparent',
            borderColor: isCompleted ? blockColor : undefined,
          }}
          title={isCompleted ? 'Click para desmarcar' : 'Click para marcar'}
        >
          {isCompleted && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </button>

        <div
          className={`flex-1 min-w-0 ${isCompleted ? 'opacity-60 line-through' : ''}`}
        >
          <div className="text-[12px] font-medium text-foreground truncate">
            {task.name}
          </div>
          {task.start_time && (
            <div className="text-[10px] text-muted-foreground">
              {task.start_time} • {task.duration_minutes}m
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRescheduleClick(task);
          }}
          className="px-1.5 py-1 rounded-lg text-muted-foreground hover:bg-muted-foreground/10 transition-opacity opacity-0 group-hover:opacity-100 text-[10px]"
          title="Reagendar"
        >
          📅
        </button>
      </div>
    </div>
  );
});
