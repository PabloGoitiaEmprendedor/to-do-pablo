import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { DbTask } from '@/hooks/useSupabaseTasks';
import { RotateCcw, Plus, Trash2, Clock, Link2, X, Pencil } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { getTodayDate } from '@/store/appStore';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Personalizada',
};

export function RoutinesView() {
  const [routines, setRoutines] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<DbTask | null>(null);

  const fetchRoutines = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .neq('recurrence_kind', 'none')
      .is('parent_task_id', null)
      .order('start_time');
    if (data) {
      const seen = new Set<string>();
      const unique = data.filter((t: any) => {
        const key = `${t.name}|${t.recurrence_kind}|${t.start_time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setRoutines(unique as DbTask[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  const deleteRoutine = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchRoutines();
  };

  const formatDays = (config: any) => {
    if (!config?.days || config.days.length === 0) return '';
    return config.days.map((d: number) => DAY_NAMES[d] || d).join(', ');
  };

  const formatTime12 = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const period = hh < 12 ? 'AM' : 'PM';
    return `${hh % 12 || 12}:${mm.toString().padStart(2, '0')} ${period}`;
  };

  const grouped = {
    daily: routines.filter(r => r.recurrence_kind === 'daily'),
    weekly: routines.filter(r => r.recurrence_kind === 'weekly'),
    monthly: routines.filter(r => r.recurrence_kind === 'monthly'),
    custom: routines.filter(r => r.recurrence_kind === 'custom'),
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Rutinas y Hábitos</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
        ) : routines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No hay rutinas creadas</div>
        ) : (
          Object.entries(grouped).map(([kind, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={kind}>
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-1">
                  {RECURRENCE_LABELS[kind]} ({items.length})
                </h3>
                <div className="space-y-1">
                  {items.map((routine) => (
                    <div
                      key={routine.id}
                      onClick={() => setEditingRoutine(routine)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{routine.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime12(routine.start_time)} · {routine.duration_minutes}min
                          </span>
                          {routine.recurrence_kind === 'weekly' && routine.recurrence_config && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDays(routine.recurrence_config)}
                            </span>
                          )}
                          {routine.link && (
                            <a href={routine.link} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                              <Link2 className="w-2.5 h-2.5 text-primary/60" />
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingRoutine(routine); }}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRoutine(routine.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateTaskModal open={showCreate} onClose={() => { setShowCreate(false); fetchRoutines(); }} defaultDate={getTodayDate()} />

      {/* Edit Routine Modal */}
      <EditRoutineModal
        routine={editingRoutine}
        onClose={() => { setEditingRoutine(null); fetchRoutines(); }}
      />
    </div>
  );
}

function EditRoutineModal({ routine, onClose }: { routine: DbTask | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [recurrenceKind, setRecurrenceKind] = useState('weekly');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDays, setMonthlyDays] = useState('');
  const [customEvery, setCustomEvery] = useState('1');
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setStartTime(routine.start_time.slice(0, 5));
      setDuration(routine.duration_minutes.toString());
      setLink(routine.link || '');
      setDescription(routine.description || '');
      setRecurrenceKind(routine.recurrence_kind);
      const config = routine.recurrence_config as any;
      if (config?.days) {
        if (routine.recurrence_kind === 'weekly') setWeeklyDays(config.days);
        if (routine.recurrence_kind === 'monthly') setMonthlyDays(config.days.join(','));
      }
      if (config?.every) setCustomEvery(config.every.toString());
      if (config?.unit) setCustomUnit(config.unit);
    }
  }, [routine]);

  const handleSave = async () => {
    if (!routine) return;
    const recurrenceConfig: Record<string, any> = {};
    if (recurrenceKind === 'weekly') recurrenceConfig.days = weeklyDays;
    if (recurrenceKind === 'monthly') recurrenceConfig.days = monthlyDays.split(',').map(Number).filter(Boolean);
    if (recurrenceKind === 'custom') { recurrenceConfig.every = parseInt(customEvery) || 1; recurrenceConfig.unit = customUnit; }

    await supabase.from('tasks').update({
      name: name.trim(),
      start_time: startTime,
      duration_minutes: parseInt(duration) || 30,
      link: link.trim() || null,
      description: description.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_config: recurrenceConfig,
    }).eq('id', routine.id);

    onClose();
  };

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <AnimatePresence>
      {routine && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-semibold">Editar rutina</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Hora</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none font-mono" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Duración (min)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1"
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Link</label>
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none" />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Descripción</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none resize-none" />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Recurrencia</label>
                <select value={recurrenceKind} onChange={(e) => setRecurrenceKind(e.target.value)}
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none">
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="custom">Personalizado</option>
                </select>

                {recurrenceKind === 'weekly' && (
                  <div className="flex gap-1 mt-2">
                    {dayNames.map((d, i) => (
                      <button key={i} type="button"
                        onClick={() => setWeeklyDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${weeklyDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                      >{d}</button>
                    ))}
                  </div>
                )}

                {recurrenceKind === 'monthly' && (
                  <input value={monthlyDays} onChange={(e) => setMonthlyDays(e.target.value)} placeholder="Días: 1,15,28"
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 mt-2 outline-none font-mono" />
                )}

                {recurrenceKind === 'custom' && (
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-sm text-muted-foreground">Cada</span>
                    <input type="number" value={customEvery} onChange={(e) => setCustomEvery(e.target.value)} min="1"
                      className="w-16 bg-secondary text-foreground text-sm rounded-lg px-2 py-1.5 outline-none font-mono" />
                    <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as any)}
                      className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1.5 outline-none">
                      <option value="days">días</option>
                      <option value="weeks">semanas</option>
                      <option value="months">meses</option>
                      <option value="years">años</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30">
                Guardar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
