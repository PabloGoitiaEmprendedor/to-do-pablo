import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useThemeStore } from '@/store/themeStore';
import { useCategories, DbCategory } from '@/hooks/useSupabaseTasks';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  preSelectedPriority?: '20' | '70' | '10' | 'optional' | null;
}

type Priority = '20' | '70' | '10' | 'optional';

export function CreateTaskModal({ open, onClose, defaultDate, preSelectedPriority }: CreateTaskModalProps) {
  const { priorityNames } = useThemeStore();
  const { categories } = useCategories();
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(defaultDate);
  const [hasDate, setHasDate] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('');
  const [priority, setPriority] = useState<Priority>('optional');
  const [link, setLink] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [recurrenceKind, setRecurrenceKind] = useState('none');
  const [customEvery, setCustomEvery] = useState('1');
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDays, setMonthlyDays] = useState('');

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setHasDate(true);
      if (preSelectedPriority) setPriority(preSelectedPriority);
      setName('');
      setDuration('');
      setLink('');
      setCategoryId(null);
      setRecurrenceKind('none');
    }
  }, [defaultDate, open, preSelectedPriority]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('El nombre de la tarea es requerido');
      return;
    }
    
    if (!startTime) {
      alert('La hora de inicio es requerida');
      return;
    }

    if (hasDate && !date) {
      alert('La fecha es requerida');
      return;
    }

    // Validar recurrencia
    if (recurrenceKind === 'weekly' && weeklyDays.length === 0) {
      alert('Selecciona al menos un día de la semana');
      return;
    }

    if (recurrenceKind === 'monthly') {
      const monthlyDaysArray = monthlyDays.split(',').map(Number).filter(Boolean);
      if (monthlyDaysArray.length === 0) {
        alert('Selecciona al menos un día del mes');
        return;
      }
    }

    const recurrenceConfig: Record<string, any> = {};
    if (recurrenceKind === 'weekly') recurrenceConfig.days = weeklyDays;
    if (recurrenceKind === 'monthly') recurrenceConfig.days = monthlyDays.split(',').map(Number).filter(Boolean);
    if (recurrenceKind === 'custom') { 
      recurrenceConfig.every = parseInt(customEvery) || 1;
      if (recurrenceConfig.every < 1) {
        alert('El intervalo debe ser mayor que 0');
        return;
      }
      recurrenceConfig.unit = customUnit;
    }

    let finalPriority = priority;
    if (!hasDate || !date) {
      finalPriority = 'optional';
    }

    const { error } = await supabase.from('tasks').insert({
      name: trimmedName,
      date: hasDate && date ? date : null,
      start_time: startTime,
      duration_minutes: Math.max(5, parseInt(duration) || 30),
      priority: finalPriority,
      status: 'pending',
      link: link.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_config: recurrenceConfig,
      category_id: categoryId,
    });
    if (error) { 
      console.error('Error creating task:', error);
      alert('Error al crear la tarea. Intenta de nuevo.');
      return;
    }

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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-md p-4 pb-safe"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-card/95 backdrop-blur-2xl border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <h2 className="text-base font-semibold">Nueva tarea</h2>
                <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <input 
                  autoFocus 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de la tarea..."
                  className="w-full bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground outline-none border-b border-border pb-3" 
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasDate(!hasDate)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      hasDate ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {hasDate ? 'Con fecha' : 'Sin fecha'}
                  </button>
                  {hasDate && (
                    <input 
                      type="date" 
                      value={date || ''} 
                      onChange={(e) => setDate(e.target.value)}
                      className="flex-1 bg-secondary text-foreground text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-ring font-mono" 
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Hora</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring font-mono" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Min</label>
                    <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
                      placeholder="30" 
                      className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring font-mono" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Categoría</label>
                    <select 
                      value={categoryId || ''} 
                      onChange={(e) => setCategoryId(e.target.value || null)}
                      className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Prioridad</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['20', '70', '10', 'optional'] as Priority[]).map((p) => {
                      const isActive = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                            isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-secondary/50 border-2 border-transparent'
                          }`}
                        >
                          <div 
                            className={`w-3 h-3 rounded-full mb-1.5 transition-all ${isActive ? 'scale-125' : 'scale-100 opacity-50 group-hover:opacity-100'}`}
                            style={{ backgroundColor: `hsl(var(--priority-${p === 'optional' ? 'optional' : p}))` }}
                          />
                          <span className={`text-[10px] font-bold tracking-wider text-center ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {priorityNames[p]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Link (opcional)</label>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                    className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Recurrencia</label>
                  <select value={recurrenceKind} onChange={(e) => setRecurrenceKind(e.target.value)}
                    className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring">
                    <option value="none">No se repite</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="custom">Personalizado</option>
                  </select>

                  {recurrenceKind === 'weekly' && (
                    <div className="flex gap-1.5 mt-2">
                      {dayNames.map((d, i) => (
                        <button key={i} type="button"
                          onClick={() => setWeeklyDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${weeklyDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                        >{d}</button>
                      ))}
                    </div>
                  )}

                  {recurrenceKind === 'monthly' && (
                    <input value={monthlyDays} onChange={(e) => setMonthlyDays(e.target.value)} placeholder="Días: 1,15,28"
                      className="w-full bg-secondary text-foreground text-sm rounded-xl px-3 py-2 mt-2 outline-none font-mono" />
                  )}

                  {recurrenceKind === 'custom' && (
                    <div className="flex gap-2 mt-2 items-center">
                      <span className="text-sm text-muted-foreground">Cada</span>
                      <input type="number" value={customEvery} onChange={(e) => setCustomEvery(e.target.value)} min="1"
                        className="w-16 bg-secondary text-foreground text-sm rounded-xl px-2 py-2 outline-none font-mono" />
                      <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as any)}
                        className="flex-1 bg-secondary text-foreground text-sm rounded-xl px-2 py-2 outline-none">
                        <option value="days">días</option>
                        <option value="weeks">semanas</option>
                        <option value="months">meses</option>
                        <option value="years">años</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border shrink-0">
                <button type="submit" disabled={!name.trim()}
                  className="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
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
