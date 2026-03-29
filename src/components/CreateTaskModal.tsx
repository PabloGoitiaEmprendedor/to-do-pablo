import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useThemeStore } from '@/store/themeStore';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  preSelectedPriority?: '20' | '70' | '10' | 'optional' | null;
}

type Priority = '20' | '70' | '10' | 'optional';

export function CreateTaskModal({ open, onClose, defaultDate, preSelectedPriority }: CreateTaskModalProps) {
  const { priorityNames } = useThemeStore();
  const [name, setName] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [link, setLink] = useState('');
  const [recurrenceKind, setRecurrenceKind] = useState('none');
  const [customEvery, setCustomEvery] = useState('1');
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDays, setMonthlyDays] = useState('');

  // Sync date when defaultDate changes (e.g. opening modal from different views)
  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      if (preSelectedPriority) setPriority(preSelectedPriority);
    }
  }, [defaultDate, open, preSelectedPriority]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!priority) {
      // Small visual feedback could go here, but for now just block
      alert("Por favor selecciona una categoría de energía (Prioridad)");
      return;
    }

    const recurrenceConfig: Record<string, any> = {};
    if (recurrenceKind === 'weekly') recurrenceConfig.days = weeklyDays;
    if (recurrenceKind === 'monthly') recurrenceConfig.days = monthlyDays.split(',').map(Number).filter(Boolean);
    if (recurrenceKind === 'custom') { recurrenceConfig.every = parseInt(customEvery) || 1; recurrenceConfig.unit = customUnit; }

    const { error } = await supabase.from('tasks').insert({
      name: name.trim(),
      date,
      start_time: startTime,
      duration_minutes: parseInt(duration) || 30,
      priority,
      status: 'pending',
      link: link.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_config: recurrenceConfig,
    });
    if (error) { console.error('Error creating task:', error); return; }

    setName('');
    setDuration('');
    setLink('');
    setRecurrenceKind('none');
    onClose();
  };

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <AnimatePresence>
      {open && (
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
            className="bg-card/95 backdrop-blur-2xl border border-border rounded-3xl w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-sm font-semibold">Nueva tarea</h2>
                <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de la tarea..."
                  className="w-full bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground outline-none border-b border-border pb-2" />

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Fecha</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  </div>
                  <div className="w-24">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Hora</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  </div>
                  <div className="w-20">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Min</label>
                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                      placeholder="30" min="1"
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Prioridad</label>
                  <div className="grid grid-cols-4 gap-2 relative">
                    {(['20', '70', '10', 'optional'] as Priority[]).map((p) => {
                      const isActive = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className="relative group flex flex-col items-center justify-center p-3 rounded-2xl transition-all outline-none"
                        >
                          {isActive && (
                            <motion.div
                              layoutId="priority-bg"
                              className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 shadow-inner"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <div 
                            className={`w-2 h-2 rounded-full mb-1.5 transition-all ${isActive ? 'scale-125' : 'scale-100 opacity-40 group-hover:opacity-100'}`}
                            style={{ backgroundColor: `hsl(var(--priority-${p === 'optional' ? 'optional' : p}))` }}
                          />
                          <span className={`text-[10px] font-bold tracking-wider transition-colors text-center block ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            {priorityNames[p]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Link (opcional)</label>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Recurrencia</label>
                  <select value={recurrenceKind} onChange={(e) => setRecurrenceKind(e.target.value)}
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none">
                    <option value="none">No se repite</option>
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

              <div className="p-4 border-t border-border">
                <button type="submit" disabled={!name.trim()}
                  className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
                  Crear tarea
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
