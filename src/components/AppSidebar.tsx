import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, SidebarPage, getTodayDate } from '@/store/appStore';
import {
  Sun,
  CalendarDays,
  RotateCcw,
  CircleDot,
  BarChart3,
  Plus,
  ChevronLeft,
  Target,
  FolderOpen,
  LayoutGrid,
} from 'lucide-react';
import { useState } from 'react';
import { CreateTaskModal } from './CreateTaskModal';
import { useTimeBlocks } from '@/hooks/useSupabaseTasks';

const DEFAULT_COLORS: Record<string, string> = {
  '20': '#EF4444',
  '70': '#F59E0B',
  '10': '#3B82F6',
  optional: '#888888',
};

export function AppSidebar() {
  const { activePage, setActivePage, sidebarOpen, setSidebarOpen } = useAppStore();
  const { blocks } = useTimeBlocks();
  const [showCreate, setShowCreate] = useState(false);

  const getBlockName = (priority?: string) => {
    if (!priority) return null;
    const block = blocks.find(b => b.priority === priority);
    return block?.name || null;
  };

  const getBlockColor = (priority?: string) => {
    if (!priority) return null;
    const block = blocks.find(b => b.priority === priority);
    return block?.color || DEFAULT_COLORS[priority] || '#888888';
  };

  const priorityBlocks = ['20', '70', '10', 'optional'] as const;

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-sidebar-border">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">DeepFlow</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-sidebar-accent transition-colors">
                <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </div>

            <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
              {/* Agenda */}
              <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-wider font-semibold px-3 pt-4 pb-1.5 block">Agenda</span>
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="today" label="Hoy" icon={Sun} />
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="planning" label="Planificación" icon={CalendarDays} />
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="routines" label="Rutinas" icon={RotateCcw} />

              {/* Prioridades */}
              <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-wider font-semibold px-3 pt-5 pb-1.5 block">Prioridades</span>
              {priorityBlocks.map((p) => (
                <SidebarButton 
                  key={p} 
                  activePage={activePage} 
                  setActivePage={setActivePage} 
                  setSidebarOpen={setSidebarOpen} 
                  id={`priority-${p}` as SidebarPage} 
                  label={getBlockName(p) || (p === 'optional' ? 'Opcionales' : `Task ${p}%`)} 
                  icon={CircleDot}
                  color={getBlockColor(p)} 
                />
              ))}

              {/* Recurrentes */}
              <span className="text-[9px] text-sidebar-foreground/30 uppercase tracking-wider font-semibold px-3 pt-4 pb-1.5 block">Recurrentes</span>
              {priorityBlocks.filter(p => p !== 'optional').map((p) => (
                <SidebarButton 
                  key={`recurring-${p}`} 
                  activePage={activePage} 
                  setActivePage={setActivePage} 
                  setSidebarOpen={setSidebarOpen} 
                  id={`recurring-${p}` as SidebarPage} 
                  label={getBlockName(p) || `Task ${p}%`} 
                  icon={RotateCcw}
                  color={getBlockColor(p)} 
                  nested
                />
              ))}

              {/* Organización */}
              <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-wider font-semibold px-3 pt-5 pb-1.5 block">Organización</span>
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="categories" label="Categorías" icon={FolderOpen} />

              {/* Análisis */}
              <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-wider font-semibold px-3 pt-5 pb-1.5 block">Análisis</span>
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="metrics" label="Métricas" icon={BarChart3} />
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="habits" label="Hábitos" icon={LayoutGrid} />
              <SidebarButton activePage={activePage} setActivePage={setActivePage} setSidebarOpen={setSidebarOpen} id="eisenhower" label="Matriz Eisenhower" icon={Target} />
            </nav>

            <div className="p-3 border-t border-sidebar-border">
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Nueva tarea
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} defaultDate={getTodayDate()} />
    </>
  );
}

function SidebarButton({ 
  activePage, setActivePage, setSidebarOpen, id, label, icon: Icon, color, nested 
}: { 
  activePage: SidebarPage; 
  setActivePage: (id: SidebarPage) => void; 
  setSidebarOpen: (open: boolean) => void;
  id: SidebarPage; 
  label: string; 
  icon: React.ElementType; 
  color?: string;
  nested?: boolean;
}) {
  const isActive = activePage === id;
  return (
    <button
      onClick={() => { setActivePage(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
        nested ? 'pl-8' : ''
      } ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
      }`}
    >
      {color ? (
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <Icon className="w-4 h-4 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
