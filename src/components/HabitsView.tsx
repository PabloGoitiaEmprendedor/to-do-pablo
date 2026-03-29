import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAllTasks, DbTask } from '@/hooks/useSupabaseTasks';
import { Zap, Droplet, BookOpen, Brain, Dumbbell, Heart, Plug, AlertTriangle, TrendingUp, Check, X, Plus, Activity, Moon, Sun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getHabitKeyForTask } from '@/lib/habitTaskMapping';
import { motion, AnimatePresence } from 'framer-motion';

const HABITS = [
  { key: 'oracion', label: 'Oración', icon: Zap },
  { key: 'agua', label: 'Tomar Agua', icon: Droplet },
  { key: 'agradecimiento', label: 'Agradecimiento', icon: BookOpen },
  { key: 'mindset', label: 'Mindset del día', icon: Brain },
  { key: 'biblia', label: 'Lectura de Biblia', icon: Heart },
  { key: 'lectura', label: 'Lectura', icon: BookOpen },
  { key: 'pasear_johnny', label: 'Pasear a Johnny', icon: Heart },
  { key: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { key: 'volver_presente', label: 'Volver al presente', icon: Plug },
  { key: 'tehillim', label: 'Lectura de Tehillim', icon: Heart },
];

const MOOD_DATA = [
  { value: 1, label: 'Muy triste', emoji: '😢', color: 'text-blue-400' },
  { value: 2, label: 'Triste', emoji: '😔', color: 'text-blue-300' },
  { value: 3, label: 'Neutro', emoji: '😐', color: 'text-gray-400' },
  { value: 4, label: 'Feliz', emoji: '😊', color: 'text-yellow-400' },
  { value: 5, label: 'Muy feliz', emoji: '😁', color: 'text-orange-400' },
];

interface HabitLog {
  id: string;
  date: string;
  habit_name: string;
  completed: boolean;
}

interface MoodLog {
  id: string;
  date: string;
  mood: number;
}

export function HabitsView() {
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    const [habitsRes, moodRes] = await Promise.all([
      supabase.from('habit_logs').select('*').order('date', { ascending: false }).limit(300),
      supabase.from('mood_logs').select('*').order('date', { ascending: false }).limit(60),
    ]);
    if (habitsRes.data) setHabitLogs(habitsRes.data as HabitLog[]);
    if (moodRes.data) setMoodLogs(moodRes.data as MoodLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleHabit = async (habitKey: string, date: string, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      await supabase.from('habit_logs').delete().eq('date', date).eq('habit_name', habitKey);
    } else {
      await supabase.from('habit_logs').upsert({ date, habit_name: habitKey, completed: true }, { onConflict: 'date,habit_name' });
    }
    fetchData();
  };

  // Today's habits status
  const todayHabits = useMemo(() => {
    return HABITS.map(h => ({
      ...h,
      completed: habitLogs.some(l => l.date === today && l.habit_name === h.key && l.completed),
    }));
  }, [habitLogs, today]);

  const todayCompleted = todayHabits.filter(h => h.completed).length;
  const todayPct = Math.round((todayCompleted / HABITS.length) * 100);

  // Long term trend (all logs)
  const longTermTrend = useMemo(() => {
    const grouped = habitLogs.reduce((acc, log) => {
      if (!log.completed) return acc;
      acc[log.date] = (acc[log.date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, count]) => ({
        date,
        displayDate: format(parseISO(date), 'dd/MM'),
        pct: Math.round((count / HABITS.length) * 100),
        count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [habitLogs]);

  // Mood trend (Area)
  const moodChartData = useMemo(() => {
    return moodLogs
      .map(log => ({
        date: log.date,
        displayDate: format(parseISO(log.date), 'dd/MM'),
        mood: log.mood
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [moodLogs]);

  // Habit statistics (14 days)
  const habitStats = useMemo(() => {
    const fourteenDaysAgo = format(addDays(new Date(), -14), 'yyyy-MM-dd');
    const recentLogs = habitLogs.filter(l => l.date >= fourteenDaysAgo);
    
    return HABITS.map(h => {
      const logs = recentLogs.filter(l => l.habit_name === h.key);
      const completed = logs.filter(l => l.completed).length;
      const pct = logs.length > 0 ? Math.round((completed / 14) * 100) : 0;
      return { ...h, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [habitLogs]);

  const worstHabits = useMemo(() => {
    return habitStats.filter(h => h.pct < 40).slice(0, 3);
  }, [habitStats]);

  const todayMood = moodLogs.find(l => l.date === today);

  const setMood = async (mood: number) => {
    await supabase.from('mood_logs').upsert({ date: today, mood }, { onConflict: 'date' });
    fetchData();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Zap className="w-5 h-5" /></motion.div>
      <span className="text-xs font-black uppercase tracking-widest">Sincronizando...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-black/5 custom-scrollbar">
      <div className="px-6 py-4 bg-background/40 backdrop-blur-xl sticky top-0 z-10 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest leading-none">Hábitos</h1>
            <p className="text-[10px] text-muted-foreground font-bold tracking-tighter">ANÁLISIS DE RENDIMIENTO</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold">HOY</p>
            <p className="text-sm font-black leading-none">{todayPct}%</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <Activity className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* Today's progress Dashboard */}
        <section>
          <div className="flex items-center gap-2 mb-8 text-primary/60">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Foco del Día</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayHabits.map(h => (
              <motion.button
                key={h.key}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleHabit(h.key, today, h.completed)}
                className={`flex items-center gap-4 p-5 rounded-[2.5rem] border transition-all relative overflow-hidden group ${
                  h.completed ? 'bg-primary/10 border-primary/20' : 'bg-card/40 border-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  h.completed ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10'
                }`}>
                  <h.icon className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-black tracking-tight block truncate uppercase">{h.label}</span>
                  <span className={`text-[10px] font-bold ${h.completed ? 'text-primary/70' : 'text-muted-foreground opacity-40'}`}>
                    {h.completed ? 'COMPLETADO' : 'PENDIENTE'}
                  </span>
                </div>
                {h.completed && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Check className="w-3 h-3" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Improved Mood Tracking (Emoji Rating) */}
        <section>
          <div className="flex items-center gap-2 mb-8 text-primary/60">
            <Heart className="w-4 h-4" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Equilibrio Emocional</h3>
          </div>
          
          <div className="p-10 rounded-[3.5rem] bg-card/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden relative group/mood">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/mood:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 text-center space-y-8">
              <h3 className="text-xl font-black tracking-tighter">¿Cómo va tu energía hoy?</h3>
              <div className="flex justify-center flex-wrap gap-4">
                {MOOD_DATA.map((m) => (
                  <motion.button
                    key={m.value}
                    whileHover={{ scale: 1.2, y: -10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center gap-4 p-6 rounded-[2.5rem] transition-all min-w-[120px] ${
                      todayMood?.mood === m.value 
                        ? 'bg-primary shadow-[0_20px_40px_-10px_rgba(var(--primary-rgb),0.5)] scale-110' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-4xl filter drop-shadow-xl">{m.emoji}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      todayMood?.mood === m.value ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Trend Analytics */}
          <section className="space-y-8">
            <div className="flex items-center gap-2 text-primary/60">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Tendencia Consistente</h3>
            </div>
            
            <div className="p-8 rounded-[3rem] bg-card/40 backdrop-blur-3xl border border-white/5 shadow-xl h-80 relative overflow-hidden group">
              <div className="absolute top-6 right-8 opacity-20 group-hover:opacity-100 transition-opacity">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={longTermTrend}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide domain={[0, 105]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '24px', 
                      fontSize: '12px',
                      padding: '12px 20px',
                      backdropBlur: '12px'
                    }}
                    itemStyle={{ color: 'hsl(var(--primary))', fontWeight: '900' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pct" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTrend)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Historical Mood */}
          <section className="space-y-8">
            <div className="flex items-center gap-2 text-primary/60">
              <Activity className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Balance Histórico</h3>
            </div>
            
            <div className="p-8 rounded-[3rem] bg-card/40 backdrop-blur-3xl border border-white/5 shadow-xl h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodChartData}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 700 }}
                  />
                  <YAxis hide domain={[0, 6]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '24px', 
                      backdropBlur: '12px'
                    }}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="mood" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorMood)"
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Alerts & Optimization */}
        <section>
          <div className="flex items-center gap-2 mb-8 text-primary/60">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Optimización de Hábitos</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {worstHabits.length > 0 && (
              <div className="p-8 rounded-[3rem] bg-destructive/5 border border-destructive/20 relative group">
                <h4 className="text-sm font-black tracking-tight mb-6 uppercase text-destructive flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Áreas Críticas
                </h4>
                <div className="space-y-4">
                  {worstHabits.map(h => (
                    <div key={h.key} className="flex items-center justify-between p-4 rounded-2xl bg-destructive/10 border border-destructive/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                          <h.icon className="w-5 h-5 text-destructive" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight">{h.label}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-destructive">{h.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-8 rounded-[3rem] bg-card/20 border border-white/5">
              <h4 className="text-sm font-black tracking-tight mb-6 uppercase flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" /> Rendimiento Detallado
              </h4>
              <div className="space-y-5">
                {habitStats.slice(0, 5).map(h => (
                  <div key={h.key}>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 px-1">
                      <span className="text-muted-foreground">{h.label}</span>
                      <span className="text-primary">{h.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${h.pct}%` }}
                        className="h-full rounded-full transition-all bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
