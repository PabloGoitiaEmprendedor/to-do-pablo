// Maps habit keys to task name patterns (case-insensitive substring match)
export const HABIT_TASK_MAP: Record<string, string[]> = {
  oracion: ['oración', 'orar', 'prayer', 'oracion'],
  agua: ['glass of water', 'water', 'agua'],
  agradecimiento: ['journaling', 'journal', 'agradecimiento', 'gratitud'],
  mindset: ['mindset'],
  biblia: ['biblia', 'bible'],
  lectura: ['book', '10 páginas', '10 paginas', 'lectura de libro'],
  pasear_johnny: ['honey', 'paseo', 'pasear'],
  gimnasio: ['gimnasio', 'gym'],
  volver_presente: ['volver al presente', 'desconexión', 'desconexion'],
  tehillim: ['tehillim'],
};

export function getHabitKeyForTask(taskName: string): string | null {
  const lower = taskName.toLowerCase();
  for (const [habitKey, patterns] of Object.entries(HABIT_TASK_MAP)) {
    if (patterns.some(p => lower.includes(p.toLowerCase()))) {
      return habitKey;
    }
  }
  return null;
}
