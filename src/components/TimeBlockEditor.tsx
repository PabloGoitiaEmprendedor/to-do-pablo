import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { DbTimeBlock } from '@/hooks/useSupabaseTasks';

interface TimeBlockEditorProps {
  block: DbTimeBlock;
  onClose: () => void;
  onSave: (updates: Partial<DbTimeBlock>) => Promise<void>;
}

export function TimeBlockEditor({ block, onClose, onSave }: TimeBlockEditorProps) {
  const [name, setName] = useState(block.name);
  const [startTime, setStartTime] = useState(block.start_time);
  const [endTime, setEndTime] = useState(block.end_time);
  const [color, setColor] = useState(block.color || '#8B6914');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, start_time: startTime, end_time: endTime, color });
    setSaving(false);
  };

  const presetColors = ['#B4461E', '#3264B4', '#B4961E', '#7846AA', '#8B6914', '#555555', '#2D8B46', '#B43264'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-sm font-semibold">Editar bloque</h2>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del bloque..."
              className="w-full bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground outline-none border-b border-border pb-2"
            />

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-secondary text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-card' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
