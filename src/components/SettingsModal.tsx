import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calendar, Moon, Sun, Settings, Clock, Palette, ShieldCheck } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useTimeBlocks, DbTimeBlock } from '@/hooks/useSupabaseTasks';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { format } from 'date-fns';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { priorityColors, setPriorityColor, priorityNames, setPriorityName, theme, toggleTheme } = useThemeStore();
  const { blocks, updateBlock, addBlock, deleteBlock } = useTimeBlocks();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { connected: calendarConnected, startAuth } = useGoogleCalendar(today);
  const [activeTab, setActiveTab] = useState<'general' | 'blocks'>('general');

  const colorPresets = [
    '#B4461E', '#D35400', '#E74C3C', '#C0392B',
    '#3264B4', '#2980B9', '#2C3E50', '#1ABC9C',
    '#B4961E', '#F39C12', '#27AE60', '#16A085',
    '#784698', '#8E44AD', '#9B59B6', '#E91E63',
  ];

  const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'blocks', label: 'Bloques', icon: Clock },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="bg-card backdrop-blur-3xl border border-border rounded-[2.5rem] w-full max-w-2xl shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] dark:shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[70vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-secondary/50 dark:bg-black/20 border-r border-border p-6 flex flex-col gap-2">
              <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest leading-tight">Ajustes</h2>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-tighter">PREFERENCIAS</p>
                </div>
              </div>

              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative font-medium ${
                    activeTab === tab.id ? 'bg-background shadow-sm text-primary dark:bg-primary/10' : 'text-muted-foreground hover:bg-background/50 dark:hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4.5 h-4.5" />
                  <span className="text-sm font-bold tracking-tight">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="tab-indicator" 
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" 
                    />
                  )}
                </button>
              ))}

              <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/30 dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-yellow-500" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all relative p-1 ${theme === 'dark' ? 'bg-primary' : 'bg-muted/20'}`}>
                    <motion.div 
                      layout 
                      className="w-3 h-3 rounded-full bg-white shadow-sm"
                      animate={{ x: theme === 'dark' ? 20 : 0 }}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background dark:bg-black/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'general' ? (
                    <div className="space-y-12">
                      <section>
                        <div className="flex items-center gap-2 mb-8 text-primary/60">
                          <Palette className="w-4 h-4" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Personalización</h3>
                        </div>
                        
                        <div className="space-y-6">
                          {(['20', '70', '10', 'optional'] as const).map((key) => (
                            <div key={key} className="p-6 rounded-[2.5rem] bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 dark:bg-card/20 dark:border-white/5 transition-all group">
                              <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center p-3 shadow-inner" style={{ backgroundColor: priorityColors[key] + '15' }}>
                                    <div className="w-full h-full rounded-lg shadow-lg" style={{ backgroundColor: priorityColors[key] }} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <input 
                                      value={priorityNames[key]}
                                      onChange={(e) => setPriorityName(key, e.target.value)}
                                      className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none pb-0.5 text-sm font-black tracking-tighter uppercase truncate transition-all text-foreground"
                                    />
                                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest opacity-40 mt-1">DEFINIR COLOR Y NOMBRE</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2.5 pl-16">
                                {colorPresets.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => setPriorityColor(key, color)}
                                    className={`w-6 h-6 rounded-xl transition-all ${priorityColors[key] === color ? 'ring-2 ring-primary ring-offset-4 ring-offset-black/20 scale-125 z-10' : 'hover:scale-110 opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                                <label className="w-6 h-6 rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-secondary dark:border-white/20 dark:hover:bg-white/10 transition-all group/plus">
                                  <Plus className="w-3 h-3 text-muted-foreground group-hover/plus:text-primary" />
                                  <input type="color" value={priorityColors[key]} onChange={(e) => setPriorityColor(key, e.target.value)} className="sr-only" />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center gap-2 mb-8 text-primary/60">
                          <ShieldCheck className="w-4 h-4" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Integraciones</h3>
                        </div>
                        
                        <div className={`p-8 rounded-[3rem] border transition-all duration-500 overflow-hidden relative group/sync shadow-sm ${
                          calendarConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border dark:bg-white/5 dark:border-white/5'
                        }`}>
                          <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover/sync:rotate-12 ${calendarConnected ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                              <Calendar className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-base font-black tracking-tight leading-none mb-1">Google Calendar</h4>
                              <p className="text-xs text-muted-foreground font-medium">Sincroniza tus bloques de tiempo vitales</p>
                            </div>
                            {calendarConnected ? (
                              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                <ShieldCheck className="w-3 h-3" /> Conectado
                              </div>
                            ) : (
                              <button onClick={startAuth} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">Autorizar</button>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                  ) : (
                    <BlocksEditor
                      blocks={blocks}
                      onUpdate={updateBlock}
                      onAdd={addBlock}
                      onDelete={deleteBlock}
                      colorPresets={colorPresets}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-2xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 dark:bg-black/40 dark:border-white/10 dark:hover:bg-black/60 dark:text-white transition-all active:scale-90 z-50 shadow-sm">
              <X className="w-5 h-5 text-current" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BlocksEditor({
  blocks,
  onUpdate,
  onAdd,
  onDelete,
  colorPresets,
}: {
  blocks: DbTimeBlock[];
  onUpdate: (id: string, updates: Partial<DbTimeBlock>) => Promise<void>;
  onAdd: (block: Omit<DbTimeBlock, 'id' | 'created_at'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  colorPresets: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const startEdit = (block: DbTimeBlock) => {
    setEditingId(block.id);
    setEditName(block.name);
    setEditStart(block.start_time);
    setEditEnd(block.end_time);
    setEditColor(block.color || '#888888');
    setError('');
  };

  const validateTimes = (start: string, end: string, excludeId?: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return 'La hora de fin debe ser después del inicio';
    for (const b of blocks) {
      if (b.id === excludeId) continue;
      const [bsh, bsm] = b.start_time.split(':').map(Number);
      const [beh, bem] = b.end_time.split(':').map(Number);
      const bs = bsh * 60 + bsm;
      const be = beh * 60 + bem;
      if (startMin < be && endMin > bs) return `Choca con "${b.name}"`;
    }
    return '';
  };

  const saveEdit = async () => {
    const err = validateTimes(editStart, editEnd, editingId!);
    if (err) { setError(err); return; }
    await onUpdate(editingId!, { name: editName, start_time: editStart, end_time: editEnd, color: editColor });
    setEditingId(null);
  };

  const handleAdd = async () => {
    const err = validateTimes(editStart, editEnd);
    if (err) { setError(err); return; }
    await onAdd({
      name: editName || 'Nuevo bloque',
      start_time: editStart,
      end_time: editEnd,
      color: editColor,
      sort_order: blocks.length,
      is_active: true,
      priority: null,
    });
    setAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary/60">
          <Clock className="w-4 h-4" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Flujo Cronológico</h3>
        </div>
        {!adding && (
          <button 
            onClick={() => { setAdding(true); setEditName(''); setEditStart('08:00'); setEditEnd('09:00'); setEditColor('#888888'); setError(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all shadow-lg shadow-primary/5"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Nodo
          </button>
        )}
      </div>

      <div className="space-y-6 relative">
        <div className="absolute left-[31px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/40 via-primary/5 to-transparent z-0" />
        
        {blocks.map((block) => (
          <div key={block.id} className="relative z-10 group">
            {editingId === block.id ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-[3rem] border border-primary/30 bg-primary/5 shadow-2xl space-y-6 relative backdrop-blur-3xl"
              >
                <div className="flex gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl" style={{ backgroundColor: editColor + '30' }}>
                    <div className="w-5 h-5 rounded-full shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: editColor }} />
                  </div>
                  <div className="flex-1">
                    <input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-transparent text-lg font-black tracking-tight outline-none border-b border-white/10 pb-3 focus:border-primary transition-all" 
                      placeholder="Nombre del bloque..."
                    />
                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest mt-2 uppercase">Identificador de Actividad</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Hora de Inicio</label>
                    <input type="time" value={editStart} onChange={(e) => { setEditStart(e.target.value); setError(''); }}
                      className="w-full bg-background border border-border dark:bg-white/5 dark:border-white/5 text-foreground text-sm font-bold rounded-2xl px-4 py-3 outline-none font-mono focus:border-primary/40 transition-all shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Hora de Fin</label>
                    <input type="time" value={editEnd} onChange={(e) => { setEditEnd(e.target.value); setError(''); }}
                      className="w-full bg-background border border-border dark:bg-white/5 dark:border-white/5 text-foreground text-sm font-bold rounded-2xl px-4 py-3 outline-none font-mono focus:border-primary/40 transition-all shadow-sm" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  {colorPresets.slice(0, 10).map((c) => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className={`w-6 h-6 rounded-xl transition-all ${editColor === c ? 'ring-2 ring-primary ring-offset-4 ring-offset-transparent scale-125 z-10' : 'hover:scale-110 opacity-60'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>

                {error && <p className="text-xs text-red-400 font-bold bg-red-400/10 p-4 rounded-2xl">{error}</p>}
                
                <div className="flex gap-3 pt-4 justify-end">
                  {!adding && (
                    <button onClick={async () => { await onDelete(block.id); setEditingId(null); }}
                      className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all hover:scale-110 active:scale-90">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => { setEditingId(null); setAdding(false); }}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-2xl hover:bg-secondary dark:hover:bg-white/5 transition-all">Descartar</button>
                  <button onClick={adding ? handleAdd : saveEdit}
                    className="px-8 py-3 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30">Confirmar</button>
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={() => startEdit(block)}
                className="w-full flex items-center gap-6 p-6 rounded-[2.5rem] bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 dark:bg-card/20 dark:border-white/5 hover:bg-accent dark:hover:bg-card/40 transition-all text-left relative group/item"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-secondary dark:bg-black/40 flex items-center justify-center transition-all duration-500 group-hover/item:scale-105 group-hover/item:bg-primary/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  <div className="w-4 h-4 rounded-full transition-all group-hover/item:shadow-[0_0_20px_currentcolor] group-hover/item:scale-125" style={{ backgroundColor: block.color || '#888' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black text-foreground block truncate tracking-tight mb-1">{block.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary dark:bg-white/5 border border-border dark:border-white/5 group-hover/item:border-primary/20 transition-all">
                      <Clock className="w-3 h-3 text-primary/60" />
                      <span className="text-[10px] font-black font-mono text-muted-foreground">{block.start_time} – {block.end_time}</span>
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover/item:opacity-100 transition-all p-3 rounded-2xl bg-secondary dark:bg-white/5 text-muted-foreground scale-90 group-hover/item:scale-100 group-hover/item:rotate-90">
                  <Settings className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>
        ))}

        {adding && !editingId && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[3rem] border border-primary/30 bg-primary/5 shadow-2xl space-y-6 relative backdrop-blur-3xl"
          >
            <div className="flex gap-5">
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-lg font-black tracking-tight outline-none border-b border-white/10 pb-3 focus:border-primary transition-all" 
                  placeholder="Nombre del nuevo nodo..."
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest mt-2 uppercase">CREAR NUEVA ACTIVIDAD</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Hora de Inicio</label>
                <input type="time" value={editStart} onChange={(e) => { setEditStart(e.target.value); setError(''); }}
                  className="w-full bg-background border border-border dark:bg-white/5 dark:border-white/5 text-foreground text-sm font-bold rounded-2xl px-4 py-3 outline-none font-mono focus:border-primary/40 transition-all shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Hora de Fin</label>
                <input type="time" value={editEnd} onChange={(e) => { setEditEnd(e.target.value); setError(''); }}
                  className="w-full bg-background border border-border dark:bg-white/5 dark:border-white/5 text-foreground text-sm font-bold rounded-2xl px-4 py-3 outline-none font-mono focus:border-primary/40 transition-all shadow-sm" />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 font-bold bg-red-400/10 p-4 rounded-2xl mt-4">{error}</p>}

            <div className="flex gap-3 pt-4 justify-end">
              <button 
                onClick={() => { setAdding(false); setError(''); }} 
                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground rounded-2xl hover:bg-secondary dark:hover:bg-white/5 transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={handleAdd} 
                className="px-8 py-3 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30"
              >
                Inicializar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
