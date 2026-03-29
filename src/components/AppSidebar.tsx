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
import { useState, useEffect } from 'react';
import { CreateTaskModal } from './CreateTaskModal';
import { useTimeBlocks } from '@/hooks/useSupabaseTasks';

interface NavItem {
  id: SidebarPage;
  label: string;
  icon: React.ElementType;
  section?: string;
  priority?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Hoy', icon: Sun, section: 'Agenda' },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'routines', label: 'Rutinas', icon: RotateCcw },
  { id: 'priority-20', label: 'Task 20%', icon: LayoutGrid, section: 'Prioridades', priority: '20' },
  { id: 'priority-70', label: 'Task 70%', icon: LayoutGrid, priority: '70' },
  { id: 'priority-10', label: 'Task 10%', icon: LayoutGrid, priority: '10' },
  { id: 'priority-optional', label: 'Opcionales', icon: CircleDot },
  { id: 'categories', label: 'Categorías', icon: FolderOpen, section: 'Organización' },
  { id: 'metrics', label: 'Métricas', icon: BarChart3, section: 'Análisis' },
  { id: 'habits', label: 'Hábitos', icon: LayoutGrid },
  { id: 'eisenhower', label: 'Matriz Eisenhower', icon: Target },
];

const DEFAULT_COLORS: Record<string, string> = {
  '20': '#EF4444',
  '70': '#F59E0B',
  '10': '#3B82F6',
  optional: '#888888',
};

export function AppSidebar() {
  const { activePage, setActivePage, sidebarOpen, setSidebarOpen, xp, level } = useAppStore();
  const { blocks } = useTimeBlocks();
  const [showCreate, setShowCreate] = useState(false);
  const XP_PER_LEVEL = 1000;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpProgress = (xpInLevel / XP_PER_LEVEL) * 100;

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

            <nav className="flex-1 py-2 px-2 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = activePage === item.id;
                const blockName = item.priority ? (getBlockName(item.priority) || item.label) : item.label;
                const blockColor = item.priority ? getBlockColor(item.priority) : null;
                let lastSection = '';
                
                return (
                  <div key={item.id}>
                    {item.section && (
                      <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-wider font-semibold px-3 pt-4 pb-1.5 block">
                        {item.section}
                      </span>
                    )}
                    <button
                      onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {blockColor ? (
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: blockColor }}
                        />
                      ) : (
                        <item.icon className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">{blockName}</span>
                    </button>
                  </div>
                );
              })}
            </nav>

            <div className="p-3 border-t border-sidebar-border space-y-3">
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-sidebar-foreground/80">⚡ Nivel {level}</span>
                  <span className="text-[10px] text-sidebar-foreground/50">{xpInLevel} / {XP_PER_LEVEL} XP</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-sidebar-accent overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
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
