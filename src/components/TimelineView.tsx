import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useDbTasks, useTimeBlocks, DbTask, DbTimeBlock } from '@/hooks/useSupabaseTasks';
import { BlockCard } from './BlockCard';
import { QuickTaskModal } from './QuickTaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { QuickRescheduleModal } from './QuickRescheduleModal';
import { FillGapsModal } from './FillGapsModal';
import { Pencil, Check, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { getHabitKeyForTask } from '@/lib/habitTaskMapping';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface TimelineViewProps {
  date: string;
  label?: string;
}

export function TimelineView({ date, label }: TimelineViewProps) {
  const { tasks, loading: tasksLoading, completeTask, failTask, updateTask, deleteTask, getEffectiveStatus, resetTask } = useDbTasks(date);
  const { blocks, loading: blocksLoading, updateBlock } = useTimeBlocks();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showFillGaps, setShowFillGaps] = useState(false);
  const [quickCreateTime, setQuickCreateTime] = useState({ start: '', duration: 0 });
  const [quickCreateBlockId, setQuickCreateBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<DbTimeBlock | null>(null);
  const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<DbTask | null>(null);
  const addXp = useAppStore((s) => s.addXp);
  
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [subtaskIndicator, setSubtaskIndicator] = useState<string | null>(null);
  const [isFillingGaps, setIsFillingGaps] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenFillGaps = () => {
    setShowFillGaps(true);
  };

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  const isToday = date === todayStr;
  const isFutureDate = date > todayStr;

  const filteredTasks = useMemo(() => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();

    return tasks.filter(t => {
      if (t.parent_task_id) return false;
      
      if (t.recurrence_kind === 'none') {
        if (t.priority === 'optional' && !t.block_id) return false;
        if (!t.date) return false;
        return t.date === date;
      }
      
      if (t.recurrence_kind === 'daily') return true;
      if (t.recurrence_kind === 'weekly') {
        const config = t.recurrence_config as any;
        if (config?.days && Array.isArray(config.days) && config.days.length > 0) {
          return config.days.includes(dayOfWeek);
        }
        return false;
      }
      if (t.recurrence_kind === 'monthly') {
        const config = t.recurrence_config as any;
        if (config?.days && Array.isArray(config.days)) {
          return config.days.includes(dayOfMonth);
        }
        return false;
      }
      if (t.recurrence_kind === 'custom') {
        const config = t.recurrence_config as any;
        if (!config?.every || !config?.unit) return false;
        const origDate = new Date(t.date + 'T00:00:00');
        const diffMs = dateObj.getTime() - origDate.getTime();
        if (diffMs < 0) return false;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        let intervalDays = config.every;
        if (config.unit === 'weeks') intervalDays *= 7;
        if (config.unit === 'months') intervalDays *= 30;
        if (config.unit === 'years') intervalDays *= 365;
        return diffDays % intervalDays === 0;
      }
      return false;
    }).map(t => {
      const effectiveStatus = getEffectiveStatus(t.id, t.status);
      if (t.recurrence_kind !== 'none' && !isToday) {
        return { ...t, status: 'pending' as const };
      }
      return { ...t, status: effectiveStatus as any };
    });
  }, [tasks, date, isToday, getEffectiveStatus]);

  const tasksByBlock = useMemo(() => {
    const map = new Map<string, DbTask[]>();
    const unassigned: DbTask[] = [];
    for (const block of blocks) map.set(block.id, []);
    for (const task of filteredTasks) {
      if (task.block_id && map.has(task.block_id)) {
        map.get(task.block_id)!.push(task);
      } else {
        const [h, m] = task.start_time.split(':').map(Number);
        const taskMin = h * 60 + m;
        let assigned = false;
        for (const block of blocks) {
          const [bh, bm] = block.start_time.split(':').map(Number);
          const [eh, em] = block.end_time.split(':').map(Number);
          if (taskMin >= bh * 60 + bm && taskMin < eh * 60 + em) {
            map.get(block.id)!.push(task);
            assigned = true;
            break;
          }
        }
        if (!assigned) unassigned.push(task);
      }
    }
    for (const [, blockTasks] of map) {
      blockTasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return { map, unassigned };
  }, [filteredTasks, blocks]);

  const handleAddToBlock = (blockId: string, blockStartTime: string, blockEndTime: string) => {
    setQuickCreateBlockId(blockId);
    const [bh, bm] = blockStartTime.split(':').map(Number);
    const [eh, em] = blockEndTime.split(':').map(Number);
    const dur = (eh * 60 + em) - (bh * 60 + bm);
    setQuickCreateTime({ start: blockStartTime, duration: Math.min(dur, 30) });
    setShowQuickCreate(true);
  };

  const handleAutoAdvance = useCallback((completedId: string) => {
    const allBlockTasks: DbTask[] = [];
    for (const block of blocks) {
      const bt = tasksByBlock.map.get(block.id) || [];
      allBlockTasks.push(...bt);
    }
    allBlockTasks.push(...tasksByBlock.unassigned);

    const completedIdx = allBlockTasks.findIndex(t => t.id === completedId);
    if (completedIdx === -1) return;

    for (let i = completedIdx + 1; i < allBlockTasks.length; i++) {
      if (allBlockTasks[i].status === 'pending') {
        setTimeout(() => setSelectedTask(allBlockTasks[i]), 700);
        return;
      }
    }
  }, [blocks, tasksByBlock]);

  // Auto-log habit when completing a task
  const logHabitForTask = useCallback(async (task: DbTask) => {
    const habitKey = getHabitKeyForTask(task.name);
    if (habitKey) {
      await supabase.from('habit_logs').upsert(
        { date: date, habit_name: habitKey, completed: true },
        { onConflict: 'date,habit_name' }
      );
    }
  }, [date]);

  // Remove habit log when uncompleting a task
  const removeHabitForTask = useCallback(async (task: DbTask) => {
    const habitKey = getHabitKeyForTask(task.name);
    if (habitKey) {
      await supabase.from('habit_logs').delete().eq('date', date).eq('habit_name', habitKey);
    }
  }, [date]);

  const handleTaskComplete = async (id: string) => {
    const task = filteredTasks.find(t => t.id === id) || tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === 'completed') {
      // Uncomplete
      await updateTask(id, { status: 'pending' });
      await removeHabitForTask(task);
      return;
    }
    // Award XP based on priority
    const xpMap: Record<string, number> = { '20': 50, '70': 20, '10': 5, 'optional': 3 };
    addXp(xpMap[task.priority] || 10);
    // Notion sync
    const notionToken = localStorage.getItem('notion_token');
    const notionDbId = localStorage.getItem('notion_db_id');
    if (notionToken && notionDbId) {
      try {
        const searchRes = await fetch('https://api.notion.com/v1/databases/' + notionDbId + '/query', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + notionToken, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: { property: 'Nombre', title: { equals: task.name } } }),
        });
        const searchData = await searchRes.json();
        const pageId = searchData?.results?.[0]?.id;
        if (pageId) {
          await fetch('https://api.notion.com/v1/pages/' + pageId, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + notionToken, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: { Estado: { status: { name: 'Completado' } } } }),
          });
        }
      } catch (_) { /* silent fail */ }
    }
    // Complete
    setCompletedTaskId(id);
    await logHabitForTask(task);
    setTimeout(async () => {
      await completeTask(id);
      setCompletedTaskId(null);
    }, 600);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 300, 
        tolerance: 10 
      } 
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !active) {
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      setHoverTargetId(null);
      setSubtaskIndicator(null);
      return;
    }
    const overId = over.id as string;
    const activeId = active.id as string;
    const isOverTask = filteredTasks.some(t => t.id === overId) && overId !== activeId;
    if (isOverTask) {
      if (hoverTargetId !== overId) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setHoverTargetId(overId);
        setSubtaskIndicator(null);
        hoverTimerRef.current = setTimeout(() => {
          setSubtaskIndicator(overId);
        }, 2000);
      }
    } else {
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      setHoverTargetId(null);
      setSubtaskIndicator(null);
    }
  }, [filteredTasks, hoverTargetId]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    const convertToSubtask = subtaskIndicator;
    setActiveTaskId(null);
    setHoverTargetId(null);
    setSubtaskIndicator(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    if (convertToSubtask && convertToSubtask === overId) {
      await updateTask(taskId, { parent_task_id: overId });
      return;
    }

    let targetBlockId: string | null = null;
    for (const block of blocks) {
      if (block.id === overId) { targetBlockId = block.id; break; }
      const blockTasks = tasksByBlock.map.get(block.id) || [];
      if (blockTasks.some(t => t.id === overId)) { targetBlockId = block.id; break; }
    }

    if (!targetBlockId) return;
    const targetBlock = blocks.find(b => b.id === targetBlockId);
    if (!targetBlock) return;

    let sourceBlockId: string | null = null;
    for (const [blockId, blockTasks] of tasksByBlock.map) {
      if (blockTasks.some(t => t.id === taskId)) { sourceBlockId = blockId; break; }
    }

    if (sourceBlockId === targetBlockId) {
      const blockTasks = [...(tasksByBlock.map.get(targetBlockId!) || [])];
      const oldIndex = blockTasks.findIndex(t => t.id === taskId);
      const newIndex = blockTasks.findIndex(t => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(blockTasks, oldIndex, newIndex);
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i].sort_order !== i) {
            await updateTask(reordered[i].id, { sort_order: i });
          }
        }
      }
    } else {
      const targetTasks = tasksByBlock.map.get(targetBlockId!) || [];
      const dropIndex = targetTasks.findIndex(t => t.id === overId);
      const newSortOrder = dropIndex >= 0 ? dropIndex : targetTasks.length;
      await updateTask(taskId, {
        block_id: targetBlockId,
        start_time: targetBlock.start_time,
        sort_order: newSortOrder,
      });
    }
  }, [blocks, tasksByBlock, updateTask, subtaskIndicator]);

  const activeTask = activeTaskId ? filteredTasks.find(t => t.id === activeTaskId) : null;

  const currentMinutes = isToday ? currentTime.getHours() * 60 + currentTime.getMinutes() : -1;
  const currentBlockIndex = useMemo(() => {
    if (!isToday) return -1;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const [h, m] = blocks[i].start_time.split(':').map(Number);
      if (currentMinutes >= h * 60 + m) return i;
    }
    return -1;
  }, [blocks, currentMinutes, isToday]);

  return (
    <div className="flex flex-col h-full">
      {/* Completion celebration */}
      <AnimatePresence>
        {completedTaskId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-green-500" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block cards with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:space-y-4">
          {isToday && blocks.length > 0 && (
            <div className="flex justify-start mb-2">
              <button
                onClick={handleOpenFillGaps}
                disabled={isFillingGaps}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Llenar Huecos
              </button>
            </div>
          )}
          {blocks.map((block, idx) => {
            const blockTasks = tasksByBlock.map.get(block.id) || [];
            const isCurrent = idx === currentBlockIndex;
            const blockColor = block.color || '#888888';

            return (
              <div key={block.id} className="relative">
                {isCurrent && (
                  <div 
                    className="absolute -left-1 top-4 bottom-4 w-[3px] rounded-full z-10"
                    style={{ backgroundColor: blockColor }}
                  />
                )}
                <BlockCard
                  block={block}
                  tasks={blockTasks}
                  allTasks={tasks}
                  onTaskSelect={setSelectedTask}
                  onTaskComplete={handleTaskComplete}
                  onAddTask={handleAddToBlock}
                  onRescheduleClick={setRescheduleTarget}
                  subtaskIndicatorId={subtaskIndicator}
                />
                <button
                  onClick={() => setEditingBlock(block)}
                  className="absolute top-0 right-24 p-1.5 rounded-lg hover:bg-accent/60 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            );
          })}

          {tasksByBlock.unassigned.length > 0 && (
            <div className="rounded-2xl border border-border px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Sin bloque</span>
              {tasksByBlock.unassigned.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-accent/40 transition-colors group"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTaskComplete(task.id); }}
                    className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="text-[12px] font-medium text-foreground truncate block">{task.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduleTarget(task);
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-opacity opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
                    title="Reagendar"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border shadow-xl">
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              <span className="text-[13px] font-medium text-foreground">{activeTask.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <QuickTaskModal
        open={showQuickCreate}
        onClose={() => { setShowQuickCreate(false); setQuickCreateBlockId(null); }}
        date={date}
        startTime={quickCreateTime.start}
        durationMinutes={quickCreateTime.duration}
        blockId={quickCreateBlockId}
      />

      {editingBlock && (
        <TimeBlockEditor
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={async (updates) => {
            await updateBlock(editingBlock.id, updates);
            setEditingBlock(null);
          }}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={updateTask}
        onComplete={handleTaskComplete}
        onFail={failTask}
        onDelete={deleteTask}
        onTaskSelect={(t) => setSelectedTask(t)}
        allTasks={tasks}
        onAutoAdvance={handleAutoAdvance}
      />

      <QuickRescheduleModal
        task={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onReschedule={(taskId, newDate) => {
          updateTask(taskId, { date: newDate, block_id: null });
        }}
        onMoveToBacklog={(taskId) => {
          updateTask(taskId, { priority: 'optional', block_id: null });
        }}
      />

      <FillGapsModal
        open={showFillGaps}
        onClose={() => setShowFillGaps(false)}
        date={date}
      />
    </div>
  );
}
