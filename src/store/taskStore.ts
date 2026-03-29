import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, PriorityCategory, RecurrenceType } from '@/types/task';

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTasksForDate: (date: string) => Task[];
  completeTask: (id: string) => void;
  failTask: (id: string) => void;
  rescheduleTask: (id: string, newDate: string, newTime: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tasks: [...s.tasks, newTask] }));
      },

      updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      getTasksForDate: (date) => {
        const all = get().tasks;
        return all
          .filter((t) => {
            if (t.date === date) return true;
            // Check recurrence
            return isRecurringOnDate(t, date);
          })
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      },

      completeTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'completed' } : t)),
        }));
      },

      failTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'failed' } : t)),
        }));
      },

      rescheduleTask: (id, newDate, newTime) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, date: newDate, startTime: newTime, status: 'rescheduled' } : t
          ),
        }));
      },
    }),
    { name: 'deepflow-tasks' }
  )
);

function isRecurringOnDate(task: Task, dateStr: string): boolean {
  const r = task.recurrence;
  if (r.kind === 'none') return false;
  
  const taskDate = new Date(task.date + 'T00:00:00');
  const checkDate = new Date(dateStr + 'T00:00:00');
  
  if (checkDate < taskDate) return false;

  const diffMs = checkDate.getTime() - taskDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  switch (r.kind) {
    case 'daily':
      return diffDays > 0;
    case 'weekly':
      return r.days.includes(checkDate.getDay());
    case 'monthly':
      return r.days.includes(checkDate.getDate());
    case 'yearly':
      return r.months.includes(checkDate.getMonth()) && checkDate.getDate() === r.day;
    case 'custom': {
      if (diffDays < 0) return false;
      switch (r.unit) {
        case 'days': return diffDays % r.every === 0 && diffDays > 0;
        case 'weeks': return diffDays % (r.every * 7) === 0 && diffDays > 0;
        case 'months': {
          const monthDiff = (checkDate.getFullYear() - taskDate.getFullYear()) * 12 + checkDate.getMonth() - taskDate.getMonth();
          return monthDiff > 0 && monthDiff % r.every === 0 && checkDate.getDate() === taskDate.getDate();
        }
        case 'years': {
          const yearDiff = checkDate.getFullYear() - taskDate.getFullYear();
          return yearDiff > 0 && yearDiff % r.every === 0 && checkDate.getMonth() === taskDate.getMonth() && checkDate.getDate() === taskDate.getDate();
        }
      }
      return false;
    }
    default:
      return false;
  }
}
