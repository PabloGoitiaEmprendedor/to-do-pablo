import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, addWeeks } from 'date-fns';
import { Calendar as CalendarIcon, X, Inbox } from 'lucide-react';
import { DbTask } from '@/hooks/useSupabaseTasks';

interface QuickRescheduleModalProps {
  task: DbTask | null;
  onClose: () => void;
  onReschedule: (taskId: string, newDate: string) => void;
  onMoveToBacklog?: (taskId: string) => void;
}

export function QuickRescheduleModal({ task, onClose, onReschedule, onMoveToBacklog }: QuickRescheduleModalProps) {
  if (!task) return null;

  const quickDates = [
    { label: 'Mañana', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Próxima Semana', date: format(addWeeks(new Date(), 1), 'yyyy-MM-dd') },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card w-full max-w-xs rounded-3xl border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
            <h3 className="text-sm font-bold truncate pr-4 text-foreground/90">{task.name}</h3>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-2 space-y-1">
            <span className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 block">Mover a...</span>
            
            {quickDates.map((qd) => (
              <button
                key={qd.label}
                onClick={() => {
                  onReschedule(task.id, qd.date);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-accent hover:text-primary transition-colors text-left"
              >
                <span>{qd.label}</span>
                <span className="text-[10px] text-muted-foreground opacity-60 font-mono">{qd.date}</span>
              </button>
            ))}
            
            <div className="px-3 py-2 mt-2 border-t border-border">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer group hover:bg-accent rounded-xl px-2 py-2 -ml-2 transition-colors">
                <CalendarIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="group-hover:text-primary transition-colors flex-1">Elegir fecha...</span>
                <input
                  type="date"
                  className="opacity-0 w-0 h-0 p-0 m-0 border-0 absolute"
                  onChange={(e) => {
                    if (e.target.value) {
                      onReschedule(task.id, e.target.value);
                      onClose();
                    }
                  }}
                />
              </label>
            </div>
            
            {onMoveToBacklog && task.priority !== 'optional' && (
              <div className="px-1 pb-1">
                <button
                  onClick={() => {
                    onMoveToBacklog(task.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
                >
                  <Inbox className="w-4 h-4" />
                  <span>Enviar al Backlog (Opcional)</span>
                </button>
              </div>
            )}
            
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
