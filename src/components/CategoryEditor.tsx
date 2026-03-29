import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useCategories, DbCategory } from '@/hooks/useSupabaseTasks';

interface CategoryEditorProps {
  category: DbCategory | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#78716C', '#1F2937',
];

export function CategoryEditor({ category, onClose }: CategoryEditorProps) {
  const { addCategory, updateCategory } = useCategories();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
    } else {
      setName('');
      setColor('#6366F1');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (category) {
      await updateCategory(category.id, { name: name.trim(), color });
    } else {
      await addCategory({ name: name.trim(), color, sort_order: 0 });
    }
    onClose();
  };

  const isEditing = !!category;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold">
                {isEditing ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Nombre</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de la categoría..."
                  className="w-full bg-secondary text-foreground text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 transition-colors"
                  >
                    <div 
                      className="w-6 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-foreground">{color}</span>
                  </button>

                  {showColorPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-xl z-10">
                      <div className="grid grid-cols-5 gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setColor(c); setShowColorPicker(false); }}
                            className={`w-10 h-10 rounded-full transition-all ${
                              color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          >
                            {color === c && <Check className="w-5 h-5 text-white mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Vista previa</p>
                  <p className="text-xs text-muted-foreground">Así se verá tu categoría</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
