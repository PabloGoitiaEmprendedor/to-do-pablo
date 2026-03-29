import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuickTaskModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  startTime: string;
  durationMinutes: number;
  blockId?: string | null;
}

type Priority = '20' | '70' | '10' | 'optional';

export function QuickTaskModal({ open, onClose, date, startTime, durationMinutes, blockId }: QuickTaskModalProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<Priority>('70');
  const [link, setLink] = useState('');
  const [duration, setDuration] = useState(durationMinutes.toString());
  const [start, setStart] = useState(startTime);
  const [recurrenceKind, setRecurrenceKind] = useState('none');
  const [customEvery, setCustomEvery] = useState('1');
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDays, setMonthlyDays] = useState('');

  useEffect(() => {
    setDuration(durationMinutes.toString());
    setStart(startTime);
  }, [durationMinutes, startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const recurrenceConfig: Record<string, any> = {};
    if (recurrenceKind === 'weekly') recurrenceConfig.days = weeklyDays;
    if (recurrenceKind === 'monthly') recurrenceConfig.days = monthlyDays.split(',').map(Number).filter(Boolean);
    if (recurrenceKind === 'custom') { recurrenceConfig.every = parseInt(customEvery) || 1; recurrenceConfig.unit = customUnit; }

    await supabase.from('tasks').insert({
      name: name.trim(),
      date,
      start_time: start,
      duration_minutes: parseInt(duration) || 30,
      priority,
      status: 'pending',
      link: link.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_config: recurrenceConfig,
      block_id: blockId || null,
    });

    setName('');
    setLink('');
    setPriority('70');
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl"
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
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de la tarea..."
                  className="w-full bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground outline-none border-b border-border pb-2"
                />

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Inicio</label>
                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Duración (min)</label>
                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="5" step="5"
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Prioridad</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['20', '70', '10', 'optional'] as Priority[]).map((p) => (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className={`text-[11px] font-medium py-1.5 px-2 rounded-lg transition-all ${priority === p ? 'ring-2 ring-foreground/30 text-foreground' : 'text-foreground/60 hover:text-foreground/80'}`}
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

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Link (opcional)</label>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Recurrencia</label>
                  <select value={recurrenceKind} onChange={(e) => setRecurrenceKind(e.target.value)}
                    className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring">
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
                          className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${weeklyDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                        >{d}</button>
                      ))}
                    </div>
                  )}

                  {recurrenceKind === 'monthly' && (
                    <input value={monthlyDays} onChange={(e) => setMonthlyDays(e.target.value)} placeholder="Días del mes: 1,15,28"
                      className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 mt-2 outline-none focus:ring-1 focus:ring-ring font-mono" />
                  )}

                  {recurrenceKind === 'custom' && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-sm text-muted-foreground self-center">Cada</span>
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
