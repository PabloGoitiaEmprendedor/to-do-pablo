import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, ChevronDown, ChevronUp, RotateCcw, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { DbTask, DbTimeBlock } from '@/hooks/useSupabaseTasks';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BlockCardProps {
  block: DbTimeBlock;
  tasks: DbTask[];
  allTasks: DbTask[];
  onTaskSelect: (task: DbTask) => void;
  onTaskComplete: (id: string) => void;
  onAddTask: (blockId: string, blockStartTime: string, blockEndTime: string) => void;
  onRescheduleClick: (task: DbTask) => void;
  subtaskIndicatorId?: string | null;
}

export function BlockCard({ block, tasks, allTasks, onTaskSelect, onTaskComplete, onAddTask, onRescheduleClick, subtaskIndicatorId }: BlockCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const blockColor = block.color || '#888888';
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;


  // Time remaining/exceeded calculation
  const [bh, bm] = block.start_time.split(':').map(Number);
  const [eh, em] = block.end_time.split(':').map(Number);
  const blockMinutes = (eh * 60 + em) - (bh * 60 + bm);
  const usedMinutes = tasks.reduce((s, t) => s + t.duration_minutes, 0);
  const remainingMinutes = blockMinutes - usedMinutes;

  const { setNodeRef, isOver } = useDroppable({ id: block.id });

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center justify-between px-1 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-sm font-semibold text-foreground">{block.name}</h3>
        <div className="flex items-center gap-1.5">
          {/* Time indicator */}
          {totalCount > 0 && (
            <span className={`text-[10px] font-mono ${
              remainingMinutes > 0 ? 'text-primary' : remainingMinutes < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {remainingMinutes > 0 ? `+${remainingMinutes}m` : remainingMinutes < 0 ? `${remainingMinutes}m` : '✓'}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAddTask(block.id, block.start_time, block.end_time); }}
            className="p-1 rounded-md hover:bg-accent/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            ref={setNodeRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden rounded-3xl p-3 transition-all duration-300"
            style={{
              backgroundColor: isOver ? `${blockColor}30` : `${blockColor}15`,
              backdropFilter: 'blur(8px)',
              border: isOver ? `2px dashed ${blockColor}60` : `1px solid ${blockColor}20`,
              boxShadow: isOver ? `0 8px 32px -4px ${blockColor}20` : 'none',
            }}
          >
            {tasks.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-xs text-muted-foreground/60">Sin tareas</span>
              </div>
            ) : (
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {tasks.map((task) => {
                    const subtasks = allTasks.filter(t => t.parent_task_id === task.id);
                    return (
                      <SortableTaskPill
                        key={task.id}
                        task={task}
                        subtasks={subtasks}
                        blockColor={blockColor}
                        onSelect={onTaskSelect}
                        onComplete={onTaskComplete}
                        onRescheduleClick={onRescheduleClick}
                        isSubtaskTarget={subtaskIndicatorId === task.id}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableTaskPill({
  task,
  subtasks,
  blockColor,
  onSelect,
  onComplete,
  onRescheduleClick,
  isSubtaskTarget,
}: {
  task: DbTask;
  subtasks: DbTask[];
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
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const [showCheck, setShowCheck] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasSubtasks = subtasks.length > 0;
  const completedSubs = subtasks.filter(s => s.status === 'completed').length;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:bg-white/5 border border-transparent hover:border-white/10 ${
          isCompleted || isFailed ? 'opacity-40 grayscale-[0.5]' : ''
        } ${isSubtaskTarget ? 'ring-2 ring-primary bg-primary/10 scale-[1.02] border-primary/30 shadow-lg shadow-primary/10' : ''}`}
        onClick={() => onSelect(task)}
        role="button"
        tabIndex={0}
      >
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 shrink-0"
          >
            <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isFailed) return;
            setShowCheck(!isCompleted);
            onComplete(task.id);
          }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            isCompleted
              ? 'border-green-500 bg-green-500'
              : isFailed
              ? 'border-red-500 bg-red-500/20'
              : 'border-muted-foreground/30 hover:border-foreground/50'
          }`}
        >
          <AnimatePresence>
            {(isCompleted || showCheck) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRescheduleClick(task);
          }}
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-opacity opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10`}
          title="Reagendar"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-nowrap overflow-hidden">
          {task.recurrence_kind !== 'none' && (
            <RotateCcw className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
          )}
          <span className={`text-[13px] font-medium leading-tight truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.name}
          </span>
        </div>

        {isSubtaskTarget && (
          <span className="text-[10px] text-primary font-medium shrink-0">↳ subtarea</span>
        )}

      </motion.div>

      <AnimatePresence>
        {expanded && hasSubtasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-6 space-y-0.5"
          >
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                onClick={() => onSelect(sub)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-accent/30 transition-colors ${
                  sub.status === 'completed' || sub.status === 'failed' ? 'opacity-40' : ''
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sub.status === 'failed') return;
                    onComplete(sub.id);
                  }}
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    sub.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'
                  }`}
                >
                  {sub.status === 'completed' && <Check className="w-2 h-2 text-white" />}
                </button>
                <span className={`text-[12px] truncate ${sub.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {sub.name}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
