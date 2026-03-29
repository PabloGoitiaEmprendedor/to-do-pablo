export type PriorityCategory = '20' | '70' | '10' | 'optional';

export type RecurrenceType = 
  | { kind: 'none' }
  | { kind: 'daily' }
  | { kind: 'weekly'; days: number[] } // 0=Sun, 1=Mon...
  | { kind: 'monthly'; days: number[] } // day of month
  | { kind: 'yearly'; months: number[]; day: number }
  | { kind: 'custom'; every: number; unit: 'days' | 'weeks' | 'months' | 'years' };

export type TaskStatus = 'pending' | 'completed' | 'failed' | 'rescheduled';

export interface Task {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  priority: PriorityCategory;
  status: TaskStatus;
  link?: string;
  recurrence: RecurrenceType;
  createdAt: string;
}

export const PRIORITY_LABELS: Record<PriorityCategory, string> = {
  '20': 'Alta Prioridad (20%)',
  '70': 'Crecimiento (70%)',
  '10': 'Reactivo (10%)',
  optional: 'Opcional',
};

export const PRIORITY_COLORS: Record<PriorityCategory, string> = {
  '20': 'bg-priority-20',
  '70': 'bg-priority-70',
  '10': 'bg-priority-10',
  optional: 'bg-priority-optional',
};

export const PRIORITY_BORDER_COLORS: Record<PriorityCategory, string> = {
  '20': 'border-l-priority-20',
  '70': 'border-l-priority-70',
  '10': 'border-l-priority-10',
  optional: 'border-l-priority-optional',
};
