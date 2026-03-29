import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppStore, getTodayDate } from '@/store/appStore';
import { AppSidebar } from '@/components/AppSidebar';
import { TimelineView } from '@/components/TimelineView';
import { PlanningView } from '@/components/PlanningView';
import { RoutinesView } from '@/components/RoutinesView';
import { PriorityView } from '@/components/PriorityView';
import { MetricsView } from '@/components/MetricsView';
import { HabitsView } from '@/components/HabitsView';
import { CategoriesView } from '@/components/CategoriesView';
import { SettingsModal } from '@/components/SettingsModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { EisenhowerMatrix } from '@/components/EisenhowerMatrix';
import { Search, Sun, CalendarDays, Target, Zap, Plus, Settings, Menu, X } from 'lucide-react';
import { useDbTasks } from '@/hooks/useSupabaseTasks';
import { useThemeStore } from '@/store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';

const Index = () => {
  const { activePage, toggleSidebar, setActivePage } = useAppStore();
  const { priorityNames } = useThemeStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<any>(null);
  const [showPrioritySelect, setShowPrioritySelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { tasks: allTasks } = useDbTasks();
  const mainRef = useRef<HTMLDivElement>(null);

  const filteredTasks = searchQuery.trim() 
    ? allTasks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const renderContent = () => {
    switch (activePage) {
      case 'today':
        return <TimelineView date={getTodayDate()} label={undefined} />;
      case 'planning':
        return <PlanningView />;
      case 'routines':
        return <RoutinesView />;
      case 'priority-20':
        return <PriorityView priority="20" />;
      case 'priority-70':
        return <PriorityView priority="70" />;
      case 'priority-10':
        return <PriorityView priority="10" />;
      case 'priority-optional':
        return <PriorityView priority="optional" />;
      case 'categories':
        return <CategoriesView />;
      case 'metrics':
        return <MetricsView />;
      case 'habits':
        return <HabitsView />;
      case 'eisenhower':
        return <EisenhowerMatrix />;
      default:
        return <TimelineView date={getTodayDate()} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden relative transition-colors duration-500">
      {/* Premium Floating Header */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl transition-all duration-700">
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-[2rem] border transition-all duration-500 ${
          scrolled || showSearch
            ? 'bg-background/80 backdrop-blur-3xl border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]'
            : 'bg-background/20 backdrop-blur-2xl border-border/40'
        }`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSidebar} 
              className="p-2.5 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group"
            >
              <Menu className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            
            {/* Unified Navigation Perspective */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/20 border border-white/5 backdrop-blur-md">
              {[
                { id: 'today', icon: Sun, label: 'Hoy' },
                { id: 'planning', icon: CalendarDays, label: 'Plan' },
                { id: 'eisenhower', icon: Target, label: 'Matriz' },
                { id: 'habits', icon: Zap, label: 'Hábitos' },
              ].map((item) => {
                const isActive = activePage === item.id || (activePage === 'today' && item.id === 'today');
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id as any)}
                    className={`relative p-2.5 rounded-xl transition-all group overflow-hidden ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="nav-glow" 
                        className="absolute inset-0 bg-primary/15 rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" 
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} 
                      />
                    )}
                    <Icon className="w-4.5 h-4.5 relative z-10" />
                    <motion.span 
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary opacity-0"
                      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.5 }}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Centralized High-End Search */}
          <div className="flex-1 max-w-sm mx-4 relative group">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-500 border ${
              showSearch ? 'bg-black/80 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]' : 'bg-white/10 border-white/5 hover:border-white/20'
            }`}>
              <Search className={`w-4 h-4 transition-all ${showSearch ? 'text-primary scale-110' : 'text-muted-foreground'}`} />
              <input 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Explorar..."
                className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground/40 font-medium tracking-tight"
              />
              {showSearch && (
                <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Premium Results View */}
            <AnimatePresence>
              {showSearch && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="absolute top-full left-0 right-0 mt-5 bg-card/95 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.4)] dark:shadow-[0_64px_128px_-32px_rgba(0,0,0,1)] overflow-hidden z-[100] max-h-[450px]"
                >
                  <div className="p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map(task => (
                        <button 
                          key={task.id}
                          onClick={() => { setShowSearch(false); setActivePage('today'); }}
                          className="w-full flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black truncate text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{task.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-1 opacity-60">
                              {task.priority}% • {task.date || 'Sin Fecha'}
                            </p>
                          </div>
                          <div 
                            className="w-2 h-2 rounded-full shadow-[0_0_12px_currentcolor]" 
                            style={{ backgroundColor: `hsl(var(--priority-${task.priority === 'optional' ? 'optional' : task.priority}))` }} 
                          />
                        </button>
                      ))
                    ) : (
                      <div className="py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <Search className="w-7 h-7 text-muted-foreground/20" />
                        </div>
                        <p className="text-[11px] text-muted-foreground/40 font-bold uppercase tracking-widest">Sin rastro en el sistema</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button 
              whileHover={{ rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              onClick={() => setShowSettings(true)} 
              className="p-2.5 rounded-2xl hover:bg-white/20 transition-all text-muted-foreground hover:text-foreground active:scale-90"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
            <button 
              onClick={() => setShowPrioritySelect(!showPrioritySelect)} 
              className={`ml-2 p-3.5 rounded-[1.25rem] transition-all duration-700 shadow-[0_15px_30px_-5px_rgba(var(--primary-rgb),0.3)] ${
                showPrioritySelect 
                  ? 'bg-destructive text-destructive-foreground rotate-[135deg] scale-110 shadow-destructive/20' 
                  : 'bg-primary text-primary-foreground hover:scale-110 active:scale-90'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

        {/* Priority Selector Overlay */}
        <AnimatePresence>
          {showPrioritySelect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="absolute top-28 right-0 z-50 flex flex-col gap-2 p-4 rounded-[2.5rem] bg-card/95 backdrop-blur-3xl border border-border shadow-[0_64px_128px_-32px_rgba(0,0,0,0.3)] dark:shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)]"
            >
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.25em] px-6 mb-3">Asignar Energía</p>
              {[
                { id: '20', label: priorityNames['20'] || '20% Esencial', color: 'hsl(var(--priority-20))', desc: 'Crítico, inmediato, alto valor' },
                { id: '70', label: priorityNames['70'] || '70% Expansión', color: 'hsl(var(--priority-70))', desc: 'Crecimiento y mejores sistemas' },
                { id: '10', label: priorityNames['10'] || '10% Soporte', color: 'hsl(var(--priority-10))', desc: 'Inercia y mantenimiento diario' },
                { id: 'optional', label: priorityNames.optional || 'Opcional', color: 'hsl(var(--priority-optional))', desc: 'Exploración y ocio productivo' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPriority(p.id); setShowPrioritySelect(false); setShowCreate(true); }}
                  className="group flex flex-col px-7 py-5 rounded-[2rem] hover:bg-accent transition-all w-80 text-left border border-transparent hover:border-border relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-1.5 relative z-10">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{p.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-snug relative z-10 font-medium">{p.desc}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div></header>

      <AppSidebar />

      <main 
        ref={mainRef} 
        className="flex-1 overflow-y-auto pt-32 px-4 sm:px-6 pb-20 scroll-smooth"
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 20)}
      >
        <div className="max-w-7xl mx-auto px-1">
          {renderContent()}
        </div>
      </main>

      <CreateTaskModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setSelectedPriority(null); }}
        defaultDate={getTodayDate()}
        preSelectedPriority={selectedPriority}
      />

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Index;
