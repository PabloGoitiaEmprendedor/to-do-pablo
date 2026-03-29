import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Check, XCircle, RotateCcw, Clock, Calendar, Link2, Plus, Trash2, FileText, ChevronDown, GripVertical, Timer, Folder } from 'lucide-react';
import { DbTask, useCategories } from '@/hooks/useSupabaseTasks';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { HABIT_TASK_MAP, getHabitKeyForTask } from '@/lib/habitTaskMapping';

interface TaskDetailModalProps {
  task: DbTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DbTask>) => void;
  onComplete: (id: string) => void;
  onFail: (id: string) => void;
  onDelete?: (id: string) => void;
  onTaskSelect?: (task: DbTask) => void;
  allTasks?: DbTask[];
  onAutoAdvance?: (completedTaskId: string) => void;
}

type Priority = '20' | '70' | '10' | 'optional';

const PRIORITY_LABELS: Record<string, string> = {
  '20': '20% Alta Prioridad',
  '70': '70% Crecimiento',
  '10': '10% Reactivo',
  optional: 'Opcional',
};

const QUICK_DATES = [
  { label: 'Hoy', getValue: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Mañana', getValue: () => format(addDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: '+1 sem', getValue: () => format(addWeeks(new Date(), 1), 'yyyy-MM-dd') },
];

const TIMER_STORAGE_KEY = 'deepflow-focus-timer';

interface TimerState {
  taskId: string;
  taskName: string;
  durationMinutes: number;
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
}

function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveTimerState(state: TimerState | null) {
  if (!state) localStorage.removeItem(TIMER_STORAGE_KEY);
  else localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
}

function getElapsedSeconds(state: TimerState): number {
  const now = Date.now();
  let elapsed: number;
  if (state.pausedAt) elapsed = state.pausedAt - state.startedAt - state.totalPausedMs;
  else elapsed = now - state.startedAt - state.totalPausedMs;
  return Math.max(0, Math.floor(elapsed / 1000));
}

export function TaskDetailModal({ task, open, onClose, onUpdate, onComplete, onFail, onDelete, onTaskSelect, allTasks = [], onAutoAdvance }: TaskDetailModalProps) {
  const { categories } = useCategories();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [priority, setPriority] = useState<Priority>('70');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskCategoryId, setTaskCategoryId] = useState<string | null>(null);
  const [recurrenceKind, setRecurrenceKind] = useState('none');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Subtasks
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [draggingSubId, setDraggingSubId] = useState<string | null>(null);

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Mood modal for "¿Cómo me sentí hoy?"
  const isMoodTask = task?.name?.includes('Cómo me sentí');

  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      setTimerState(saved);
      setFocusMode(true);
      setElapsed(getElapsedSeconds(saved));
    }
  }, []);

  useEffect(() => {
    if (!timerState || timerState.pausedAt) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const tick = () => {
      if (timerState) setElapsed(getElapsedSeconds(timerState));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [timerState]);

  useEffect(() => {
    if (timerState?.pausedAt) setElapsed(getElapsedSeconds(timerState));
  }, [timerState?.pausedAt]);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setStartTime(task.start_time);
      setDuration(task.duration_minutes.toString());
      setPriority(task.priority as Priority);
      setLink(task.link || '');
      setDescription(task.description || '');
      setTaskDate(task.date || '');
      setTaskCategoryId(task.category_id);
      setRecurrenceKind(task.recurrence_kind);
      setEditing(false);
      setShowAddSubtask(false);
      setNewSubtaskName('');
      setShowDatePicker(false);
      setShowPriorityPicker(false);
      setShowCategoryPicker(false);

      const saved = loadTimerState();
      if (saved && saved.taskId === task.id) {
        setTimerState(saved);
        setFocusMode(true);
      }
    }
  }, [task]);

  const handleClose = useCallback(() => {
    if (focusMode) return;
    onClose();
  }, [focusMode, onClose]);

  const startFocus = useCallback(() => {
    if (!task) return;
    const state: TimerState = {
      taskId: task.id,
      taskName: task.name,
      durationMinutes: task.duration_minutes,
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
    };
    setTimerState(state);
    saveTimerState(state);
    setFocusMode(true);
    setElapsed(0);
  }, [task]);

  const pauseFocus = useCallback(() => {
    if (!timerState) return;
    const updated = { ...timerState, pausedAt: Date.now() };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState]);

  const resumeFocus = useCallback(() => {
    if (!timerState || !timerState.pausedAt) return;
    const pauseDuration = Date.now() - timerState.pausedAt;
    const updated = { ...timerState, pausedAt: null, totalPausedMs: timerState.totalPausedMs + pauseDuration };
    setTimerState(updated);
    saveTimerState(updated);
  }, [timerState]);

  const stopFocus = useCallback(() => {
    setTimerState(null);
    saveTimerState(null);
    setFocusMode(false);
    setElapsed(0);
  }, []);

  const completeFocused = useCallback(() => {
    if (timerState) {
      onComplete(timerState.taskId);
      onAutoAdvance?.(timerState.taskId);
    }
    stopFocus();
    onClose();
  }, [timerState, onComplete, stopFocus, onClose, onAutoAdvance]);

  // Subtask helpers
  const subtasks = task ? allTasks.filter(t => t.parent_task_id === task.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];

  const addSubtask = async () => {
    if (!task || !newSubtaskName.trim()) return;
    const isParentRecurring = task.recurrence_kind !== 'none';
    await supabase.from('tasks').insert({
      name: newSubtaskName.trim(),
      date: task.date,
      start_time: task.start_time,
      duration_minutes: 15,
      priority: task.priority,
      status: 'pending',
      parent_task_id: task.id,
      block_id: task.block_id,
      sort_order: subtasks.length,
      recurrence_kind: isParentRecurring ? task.recurrence_kind : 'none',
      recurrence_config: isParentRecurring ? task.recurrence_config : {},
    });
    setNewSubtaskName('');
  };

  const moveSubtask = async (subId: string, direction: 'up' | 'down') => {
    const idx = subtasks.findIndex(s => s.id === subId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= subtasks.length) return;
    // Swap sort_order
    await Promise.all([
      supabase.from('tasks').update({ sort_order: newIdx }).eq('id', subtasks[idx].id),
      supabase.from('tasks').update({ sort_order: idx }).eq('id', subtasks[newIdx].id),
    ]);
  };

  // Quick date change
  const quickChangeDate = async (newDate: string) => {
    if (!task) return;
    onUpdate(task.id, { date: newDate });
    setTaskDate(newDate);
    setShowDatePicker(false);
  };

  // Quick priority change
  const quickChangePriority = async (newPriority: Priority) => {
    if (!task) return;
    onUpdate(task.id, { priority: newPriority });
    setPriority(newPriority);
    setShowPriorityPicker(false);
  };

  // Mood selection
  const selectMood = async (mood: number) => {
    if (!task) return;
    await supabase.from('mood_logs').upsert(
      { date: task.date, mood },
      { onConflict: 'date' }
    );
    onComplete(task.id);
    onAutoAdvance?.(task.id);
    onClose();
  };

  if (!task && !focusMode) return null;

  const currentTask = task;
  const totalSeconds = (timerState?.durationMinutes || currentTask?.duration_minutes || 30) * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const isOvertime = elapsed > totalSeconds;

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime12 = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const period = hh < 12 ? 'AM' : 'PM';
    return `${hh % 12 || 12}:${mm.toString().padStart(2, '0')} ${period}`;
  };

  const handleSave = () => {
    if (!currentTask) return;
    onUpdate(currentTask.id, {
      name: name.trim(),
      start_time: startTime,
      duration_minutes: parseInt(duration) || 30,
      priority,
      link: link.trim() || null,
      description: description.trim() || null,
      date: taskDate || null,
      recurrence_kind: recurrenceKind,
      category_id: taskCategoryId,
    });
    setEditing(false);
  };

  const isCompleted = currentTask?.status === 'completed';
  const isFailed = currentTask?.status === 'failed';
  const isPaused = !!timerState?.pausedAt;

  const POMODORO_WORK = 25 * 60;
  const POMODORO_BREAK = 5 * 60;

  // ===================== FULL SCREEN FOCUS MODE =====================
  if (focusMode && timerState) {
    const pomodoroElapsed = elapsed % (POMODORO_WORK + POMODORO_BREAK);
    const inBreak = pomodoroElapsed >= POMODORO_WORK;
    const segmentElapsed = inBreak ? pomodoroElapsed - POMODORO_WORK : pomodoroElapsed;
    const segmentTotal = inBreak ? POMODORO_BREAK : POMODORO_WORK;
    const segmentRemaining = Math.max(0, segmentTotal - segmentElapsed);
    const segmentProgress = segmentTotal > 0 ? Math.min(100, (segmentElapsed / segmentTotal) * 100) : 0;
    const totalPomodorosNeeded = Math.ceil(totalSeconds / POMODORO_WORK);
    const currentPomodoro = Math.floor(elapsed / (POMODORO_WORK + POMODORO_BREAK)) + 1;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            style={{
              backgroundColor: inBreak ? 'hsl(var(--primary) / 0.06)' : isOvertime ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--priority-20) / 0.06)',
            }}
            animate={{ height: `${Math.min(segmentProgress, 100)}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-lg">
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
            {inBreak ? '☕ DESCANSO' : 'MODO FOCO'}
          </span>
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Pomodoro {currentPomodoro}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-8 leading-tight">{timerState.taskName}</h1>

          <div className="relative w-56 h-56 sm:w-72 sm:h-72 mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <motion.circle
                cx="100" cy="100" r="90" fill="none"
                stroke={inBreak ? 'hsl(var(--primary))' : isOvertime ? 'hsl(var(--destructive))' : 'hsl(var(--priority-20))'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 90}
                animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - Math.min(segmentProgress, 100) / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl sm:text-5xl font-mono font-bold tracking-tighter ${inBreak ? 'text-primary' : isOvertime ? 'text-destructive' : ''}`}>
                {formatTimer(segmentRemaining)}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {inBreak ? 'descanso' : 'restante'}
              </span>
            </div>
          </div>

          <span className="text-sm font-mono text-muted-foreground mb-8">{Math.round(Math.min(progress, 100))}% total</span>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={isPaused ? resumeFocus : pauseFocus}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-accent transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Continuar' : 'Pausar'}
            </button>
            <button
              onClick={completeFocused}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" /> Completar
            </button>
          </div>

          <button onClick={stopFocus} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Abandonar sesión
          </button>
        </div>
      </motion.div>
    );
  }

  // ===================== DETAIL MODAL =====================
  if (!currentTask) return null;

  const MOOD_EMOJIS = ['😢', '😔', '😐', '😊', '😁'];
  const MOOD_LABELS_INNER = ['Muy triste', 'Triste', 'Neutro', 'Feliz', 'Muy feliz'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-md p-4 pb-safe"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with quick priority & date */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                  className="flex items-center gap-1.5 hover:bg-accent px-2 py-1 rounded-lg transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(var(--priority-${priority === 'optional' ? 'optional' : priority}))` }}
                  />
                  <span className="text-xs text-muted-foreground font-medium">{PRIORITY_LABELS[priority]}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>

                {/* Priority dropdown */}
                <AnimatePresence>
                  {showPriorityPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 p-1.5 min-w-[160px]"
                    >
                      {(['20', '70', '10', 'optional'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => quickChangePriority(p)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent ${
                            priority === p ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(var(--priority-${p === 'optional' ? 'optional' : p}))` }} />
                          {PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1">
                {!editing && !isCompleted && !isFailed && (
                  <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors">
                    Editar
                  </button>
                )}
                <button onClick={handleClose} className="p-1 rounded hover:bg-accent transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {editing ? (
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-foreground text-lg font-semibold outline-none border-b border-border pb-3" />
              ) : (
                <h2 className={`text-lg font-semibold ${isCompleted ? 'line-through opacity-50' : ''}`}>{currentTask.name}</h2>
              )}

              {(isCompleted || isFailed) && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isCompleted ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {isCompleted ? 'Completada' : 'Fallida'}
                </span>
              )}

              <div className="space-y-3">
                {/* Quick date change */}
                <div className="flex items-center gap-3 text-sm relative">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  {editing ? (
                    <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)}
                      className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1 outline-none font-mono" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="text-foreground/80 font-mono hover:bg-accent px-2 py-0.5 rounded transition-colors"
                      >
                        {currentTask.date}
                      </button>
                      <AnimatePresence>
                        {showDatePicker && !isCompleted && !isFailed && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 p-2 flex flex-col gap-1"
                          >
                            {QUICK_DATES.map(qd => (
                              <button
                                key={qd.label}
                                onClick={() => quickChangeDate(qd.getValue())}
                                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
                              >
                                {qd.label}
                              </button>
                            ))}
                            <input
                              type="date"
                              className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1.5 outline-none font-mono mt-1"
                              onChange={(e) => { if (e.target.value) quickChangeDate(e.target.value); }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Time & Duration */}
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  {editing ? (
                    <div className="flex gap-2 flex-1">
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                        className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1 outline-none font-mono" />
                      <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="5" step="5" placeholder="min"
                        className="w-20 bg-secondary text-foreground text-sm rounded-lg px-2 py-1 outline-none font-mono" />
                      <span className="text-muted-foreground self-center text-xs">min</span>
                    </div>
                  ) : (
                    <span className="text-foreground/80">
                      {currentTask.start_time !== '00:00:00' && currentTask.start_time !== '00:00' ? formatTime12(currentTask.start_time) + ' · ' : ''}
                      {currentTask.duration_minutes} min
                    </span>
                  )}
                </div>

                {currentTask.recurrence_kind !== 'none' && (
                  <div className="flex items-center gap-3 text-sm">
                    <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground/80 capitalize">{currentTask.recurrence_kind === 'daily' ? 'Diaria' : currentTask.recurrence_kind}</span>
                  </div>
                )}

                {/* Description */}
                {editing ? (
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción..."
                      rows={3}
                      className="w-full bg-secondary text-foreground text-sm rounded-xl px-4 py-3 outline-none resize-none" />
                  </div>
                ) : currentTask.description ? (
                  <div className="flex items-start gap-3 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-foreground/80 text-sm whitespace-pre-wrap">{currentTask.description}</p>
                  </div>
                ) : null}

                {/* Category */}
                <div className="flex items-center gap-3 text-sm relative">
                  <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                  {!editing && (
                    <button
                      onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                      className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded-lg transition-colors"
                    >
                      {taskCategoryId ? (
                        <>
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: categories.find(c => c.id === taskCategoryId)?.color || '#888' }}
                          />
                          <span className="text-foreground/80">
                            {categories.find(c => c.id === taskCategoryId)?.name || 'Sin categoría'}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sin categoría</span>
                      )}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  <AnimatePresence>
                    {showCategoryPicker && !editing && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full left-6 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 p-2 min-w-[160px]"
                      >
                        <button
                          onClick={() => { onUpdate(currentTask.id, { category_id: null }); setTaskCategoryId(null); setShowCategoryPicker(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent ${!taskCategoryId ? 'bg-accent' : ''}`}
                        >
                          <span className="text-muted-foreground">Sin categoría</span>
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { onUpdate(currentTask.id, { category_id: cat.id }); setTaskCategoryId(cat.id); setShowCategoryPicker(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent ${taskCategoryId === cat.id ? 'bg-accent' : ''}`}
                          >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Link */}
                {(link || currentTask.link || editing) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    {editing ? (
                      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                        className="flex-1 bg-secondary text-foreground text-sm rounded-lg px-2 py-1 outline-none" />
                    ) : currentTask.link ? (
                      <a href={currentTask.link} target="_blank" rel="noopener" className="text-primary/70 hover:text-primary underline truncate">{currentTask.link}</a>
                    ) : null}
                  </div>
                )}

                {editing && (
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Prioridad</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['20', '70', '10', 'optional'] as Priority[]).map((p) => (
                        <button key={p} type="button" onClick={() => setPriority(p)}
                          className={`text-[11px] font-medium py-1.5 px-2 rounded-lg transition-all ${priority === p ? 'ring-2 ring-foreground/30 text-foreground' : 'text-foreground/60'}`}
                          style={{
                            backgroundColor: priority === p
                              ? `hsl(var(--priority-${p === 'optional' ? 'optional' : p}) / 0.4)`
                              : `hsl(var(--priority-${p === 'optional' ? 'optional' : p}) / 0.15)`,
                          }}
                        >
                          {p === '20' ? '20%' : p === '70' ? '70%' : p === '10' ? '10%' : 'Opc'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mood panel for mood task */}
              {isMoodTask && !isCompleted && !isFailed && (
                <div className="border-t border-border pt-3">
                  <h3 className="text-sm font-semibold mb-3">¿Cómo te sentiste hoy?</h3>
                  <div className="flex justify-between gap-1">
                    {MOOD_EMOJIS.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => selectMood(i + 1)}
                        className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl hover:bg-accent transition-all"
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[9px] text-muted-foreground">{MOOD_LABELS_INNER[i]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks section */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Subtareas</span>
                  <button
                    onClick={() => setShowAddSubtask(!showAddSubtask)}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {subtasks.map((sub, idx) => (
                  <div key={sub.id} className="flex items-center gap-1 px-1 py-1.5 rounded-lg hover:bg-accent/30 cursor-pointer transition-colors group"
                    onClick={() => {
                      onClose();
                      setTimeout(() => onTaskSelect?.(sub), 150);
                    }}
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSubtask(sub.id, 'up'); }}
                        className={`p-0.5 hover:bg-accent rounded ${idx === 0 ? 'invisible' : ''}`}
                      >
                        <ChevronDown className="w-2.5 h-2.5 text-muted-foreground rotate-180" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSubtask(sub.id, 'down'); }}
                        className={`p-0.5 hover:bg-accent rounded ${idx === subtasks.length - 1 ? 'invisible' : ''}`}
                      >
                        <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sub.status === 'completed') return;
                        onComplete(sub.id);
                      }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        sub.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'
                      }`}
                    >
                      {sub.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 ${sub.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {sub.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.duration_minutes > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">{sub.duration_minutes}m</span>
                      )}
                      {sub.link && <Link2 className="w-2.5 h-2.5 text-muted-foreground" />}
                      {sub.recurrence_kind !== 'none' && <RotateCcw className="w-2.5 h-2.5 text-muted-foreground" />}
                      <ChevronDown className="w-3 h-3 text-muted-foreground -rotate-90" />
                    </div>
                  </div>
                ))}

                {showAddSubtask && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
                      placeholder="Nueva subtarea..."
                      className="flex-1 bg-secondary text-foreground text-sm rounded-lg px-2 py-1.5 outline-none"
                    />
                    <button onClick={addSubtask} disabled={!newSubtaskName.trim()}
                      className="px-2 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg disabled:opacity-30">
                      Añadir
                    </button>
                  </div>
                )}

                {subtasks.length === 0 && !showAddSubtask && (
                  <span className="text-xs text-muted-foreground/60">Sin subtareas</span>
                )}
              </div>

              {/* Start Focus button */}
              {!isCompleted && !isFailed && !editing && !isMoodTask && (
                <button
                  onClick={startFocus}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Play className="w-4 h-4" /> Iniciar modo foco
                </button>
              )}
            </div>

            {/* Actions footer */}
            <div className="p-4 sm:p-5 border-t border-border shrink-0">
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-accent transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
                      Guardar
                    </button>
                  </>
                ) : !isCompleted && !isFailed ? (
                  <>
                    <button onClick={() => { onComplete(currentTask.id); onAutoAdvance?.(currentTask.id); onClose(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-600 text-sm font-semibold rounded-xl hover:bg-green-500/30 transition-colors">
                      <Check className="w-4 h-4" /> Completar
                    </button>
                    <button onClick={() => { onFail(currentTask.id); onAutoAdvance?.(currentTask.id); onClose(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-500/30 transition-colors">
                      <XCircle className="w-4 h-4" /> Fallar
                    </button>
                  </>
                ) : (
                  <button onClick={handleClose} className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-accent transition-colors">
                    Cerrar
                  </button>
                )}
                {onDelete && currentTask && (
                  <button
                    onClick={() => { onDelete(currentTask.id); onClose(); }}
                    className="p-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
