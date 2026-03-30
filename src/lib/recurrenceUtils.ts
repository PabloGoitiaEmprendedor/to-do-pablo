import { DbTask } from '@/hooks/useSupabaseTasks';

/**
 * Determina si una tarea recurrente debe aparecer en una fecha específica
 */
export function isRecurringOnDate(task: DbTask, date: string): boolean {
  if (!task || task.recurrence_kind === 'none') {
    return false;
  }

  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const dayOfMonth = dateObj.getDate();
  const month = dateObj.getMonth();

  switch (task.recurrence_kind) {
    case 'daily':
      return true;

    case 'weekly': {
      const config = task.recurrence_config as any;
      if (config?.days && Array.isArray(config.days) && config.days.length > 0) {
        return config.days.includes(dayOfWeek);
      }
      return false;
    }

    case 'monthly': {
      const config = task.recurrence_config as any;
      if (config?.days && Array.isArray(config.days)) {
        return config.days.includes(dayOfMonth);
      }
      return false;
    }

    case 'yearly': {
      const config = task.recurrence_config as any;
      if (config?.months && Array.isArray(config.months) && config?.day) {
        return config.months.includes(month) && dayOfMonth === config.day;
      }
      return false;
    }

    case 'custom': {
      const config = task.recurrence_config as any;
      if (!config?.every || !config?.unit) return false;

      const origDate = new Date(task.date + 'T00:00:00');
      const diffMs = dateObj.getTime() - origDate.getTime();
      
      if (diffMs < 0) return false;

      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      let intervalDays = config.every;

      if (config.unit === 'weeks') intervalDays *= 7;
      else if (config.unit === 'months') intervalDays *= 30;
      else if (config.unit === 'years') intervalDays *= 365;

      return diffDays % intervalDays === 0;
    }

    default:
      return false;
  }
}

/**
 * Filtra tareas para una fecha específica, incluyendo recurrencias
 */
export function filterTasksByDate(
  tasks: DbTask[],
  date: string,
  isToday: boolean,
  getEffectiveStatus: (id: string, status: string) => string
): DbTask[] {
  return tasks
    .filter(t => {
      // Excluir subtareas
      if (t.parent_task_id) return false;

      // Si no es recurrente, debe coincidir exactamente con la fecha
      if (t.recurrence_kind === 'none') {
        if (t.priority === 'optional' && !t.block_id) return false;
        if (!t.date) return false;
        return t.date === date;
      }

      // Si es recurrente, verificar si aparece en esta fecha
      return isRecurringOnDate(t, date);
    })
    .map(t => {
      // Para tareas recurrentes en días futuros, mostrar como "pending"
      if (t.recurrence_kind !== 'none' && !isToday) {
        return { ...t, status: 'pending' as const };
      }
      // Para tareas en hoy, usar el estado efectivo (completado hoy vs. completado en general)
      return { ...t, status: getEffectiveStatus(t.id, t.status) as any };
    });
}

/**
 * Valida la configuración de recurrencia según el tipo
 */
export function isValidRecurrenceConfig(kind: string, config: any): boolean {
  switch (kind) {
    case 'none':
    case 'daily':
      return true;

    case 'weekly':
      return config?.days && Array.isArray(config.days) && config.days.length > 0;

    case 'monthly':
      return config?.days && Array.isArray(config.days) && config.days.length > 0;

    case 'yearly':
      return config?.months && Array.isArray(config.months) && config.months.length > 0 && typeof config.day === 'number';

    case 'custom':
      return config?.every && typeof config.every === 'number' && ['days', 'weeks', 'months', 'years'].includes(config.unit);

    default:
      return false;
  }
}

/**
 * Obtiene una descripción legible de la recurrencia
 */
export function getRecurrenceLabel(kind: string, config: any): string {
  switch (kind) {
    case 'none':
      return 'Una sola vez';

    case 'daily':
      return 'Todos los días';

    case 'weekly': {
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const days = config?.days?.map((d: number) => dayNames[d]).join(', ');
      return `Cada ${days}`;
    }

    case 'monthly': {
      const days = config?.days?.join(', ');
      return `Día ${days} de cada mes`;
    }

    case 'yearly': {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const months = config?.months?.map((m: number) => monthNames[m]).join(', ');
      return `${config?.day} de ${months}`;
    }

    case 'custom': {
      const units: Record<string, string> = {
        'days': 'día',
        'weeks': 'semana',
        'months': 'mes',
        'years': 'año'
      };
      return `Cada ${config?.every} ${units[config?.unit] || config?.unit}`;
    }

    default:
      return 'Desconocido';
  }
}
