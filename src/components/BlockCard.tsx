import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbTask, DbTimeBlock } from '@/hooks/useSupabaseTasks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, Plus } from 'lucide-react';

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
    <div className="rounded-2xl border border-border overflow-hidden">
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-accent/20 transition-colors"
        style={{ backgroundColor: `${blockColor}15` }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ChevronDown
            className="w-4 h-4 transition-transform shrink-0"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">{block.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {block.start_time} - {block.end_time} • {usedMinutes}/{blockMinutes}m
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: blockColor,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-6 text-right">
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
            className="px-3 py-2 space-y-1.5 bg-card/50 border-t border-border"
          >
            {tasks.length === 0 ? (
              <button
                onClick={onAddTask}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-accent/40 transition-colors text-[12px]"
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

const SortableTaskPill = React.memo(function SortableTaskPill({
  task,
  blockColor,
  onSelect,
  onComplete,
  onRescheduleClick,
  isSubtaskTarget,
}: {
  task: DbTask;
  blockColor: string;
  onSelect: (task: DbTask) => void;
  onComplete: (id: string) => void;
  onRescheduleClick: (task: DbTask) => void;
  isSubtaskTarget?: boolean;
}) {
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

  const isCompleted = task.status === 'completed';

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
          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
            isCompleted
              ? 'border-primary bg-primary'
              : 'border-muted-foreground/30 hover:border-muted-foreground/60'
          }`}
          style={{
            backgroundColor: isCompleted ? blockColor : 'transparent',
            borderColor: isCompleted ? blockColor : undefined,
          }}
        >
          {isCompleted && (
            <div className="w-full h-full flex items-center justify-center text-white text-[8px]">
              ✓
            </div>
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
