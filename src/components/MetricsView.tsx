import { useMemo } from 'react';
import { useAllTasks } from '@/hooks/useSupabaseTasks';
import { useTimeBlocks } from '@/hooks/useSupabaseTasks';
import { BarChart3, Clock, Target, TrendingUp, AlertTriangle, Zap, Coffee, Flame, Calendar } from 'lucide-react';
import { format, subDays, isAfter, parseISO, getDay } from 'date-fns';

export function MetricsView() {
  const { tasks, loading } = useAllTasks();
  const { blocks } = useTimeBlocks();

  const metrics = useMemo(() => {
    if (tasks.length === 0) return null;

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const p20 = tasks.filter(t => t.priority === '20');
    const p70 = tasks.filter(t => t.priority === '70');
    const p10 = tasks.filter(t => t.priority === '10');
    const pOpt = tasks.filter(t => t.priority === 'optional');

    const deepWorkMin = p20.filter(t => t.status === 'completed').reduce((s, t) => s + t.duration_minutes, 0);
    const totalPlannedMin = tasks.reduce((s, t) => s + t.duration_minutes, 0);
    const p20Min = p20.reduce((s, t) => s + t.duration_minutes, 0);
    const p70Min = p70.reduce((s, t) => s + t.duration_minutes, 0);
    const p10Min = p10.reduce((s, t) => s + t.duration_minutes, 0);

    const p20Pct = totalPlannedMin > 0 ? Math.round((p20Min / totalPlannedMin) * 100) : 0;
    const p70Pct = totalPlannedMin > 0 ? Math.round((p70Min / totalPlannedMin) * 100) : 0;
    const p10Pct = totalPlannedMin > 0 ? Math.round((p10Min / totalPlannedMin) * 100) : 0;

    // Time wasted calculation per day
    // Wasted = time in work blocks that doesn't have tasks (excluding breaks/Sundays)
    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));

    let totalWastedMin = 0;
    let daysWithData = 0;

    for (const dayStr of last7) {
      const dayDate = parseISO(dayStr);
      if (getDay(dayDate) === 0) continue; // Skip Sundays

      const dayTasks = tasks.filter(t => t.date === dayStr && t.status === 'completed');
      if (dayTasks.length === 0) continue;
      daysWithData++;

      // Total block time (only work blocks, not breaks)
      const workBlocks = blocks.filter(b =>
        !b.name.toLowerCase().includes('break') &&
        !b.name.toLowerCase().includes('descanso') &&
        !b.name.toLowerCase().includes('almuerz')
      );

      let totalBlockMin = 0;
      for (const block of workBlocks) {
        const [sh, sm] = block.start_time.split(':').map(Number);
        const [eh, em] = block.end_time.split(':').map(Number);
        totalBlockMin += (eh * 60 + em) - (sh * 60 + sm);
      }

      const usedMin = dayTasks.reduce((s, t) => s + t.duration_minutes, 0);
      totalWastedMin += Math.max(0, totalBlockMin - usedMin);
    }

    const avgWastedMin = daysWithData > 0 ? Math.round(totalWastedMin / daysWithData) : 0;

    // Streak: consecutive days with >70% completion
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      if (getDay(parseISO(d)) === 0) { streak++; continue; }
      const dayTotal = tasks.filter(t => t.date === d);
      const dayCompleted = dayTotal.filter(t => t.status === 'completed');
      if (dayTotal.length === 0) break;
      if (dayTotal.length > 0 && dayCompleted.length / dayTotal.length >= 0.7) {
        streak++;
      } else break;
    }

    // Average tasks per day (last 7)
    const avgTasksPerDay = daysWithData > 0
      ? Math.round(last7.reduce((s, d) => s + tasks.filter(t => t.date === d).length, 0) / daysWithData)
      : 0;

    // Focus score (0-100)
    const focusScore = Math.min(100, Math.round(
      (completionRate * 0.4) +
      (p20Pct * 0.3) +
      (Math.max(0, 100 - p10Pct * 3) * 0.15) +
      (Math.min(streak, 7) / 7 * 100 * 0.15)
    ));

    // Insights
    const insights: { text: string; type: 'warning' | 'tip' | 'success' }[] = [];
    if (p10Pct > 15) insights.push({ text: `Estás dedicando ${p10Pct}% a tareas reactivas. Reduce esto al 10% o menos.`, type: 'warning' });
    if (failed > total * 0.3 && total > 5) insights.push({ text: 'Más del 30% de tus tareas fallaron. Considera planificar menos tareas pero más realistas.', type: 'warning' });
    if (avgWastedMin > 60) insights.push({ text: `Pierdes ~${Math.round(avgWastedMin / 60)}h ${avgWastedMin % 60}m al día en bloques de trabajo sin actividad.`, type: 'warning' });
    if (deepWorkMin < 120 && total > 10) insights.push({ text: 'Tu Deep Work es bajo. Prioriza las tareas del 20% en las primeras horas.', type: 'tip' });
    if (completionRate > 80) insights.push({ text: '¡Excelente tasa de completado! Mantén el ritmo.', type: 'success' });
    if (streak >= 3) insights.push({ text: `🔥 Llevas ${streak} días consecutivos siendo productivo.`, type: 'success' });
    if (p20Pct >= 20 && p20Pct <= 30) insights.push({ text: 'Tu distribución 20% está en el rango ideal. ¡Sigue así!', type: 'success' });
    if (p20Pct < 15 && total > 5) insights.push({ text: 'Dedica más tiempo a tareas del 20%. Son las que generan mayor impacto.', type: 'tip' });

    return {
      total, completed, failed, pending, completionRate,
      p20, p70, p10, pOpt,
      deepWorkMin, totalPlannedMin,
      p20Min, p70Min, p10Min,
      p20Pct, p70Pct, p10Pct,
      avgWastedMin, streak, avgTasksPerDay, focusScore,
      insights,
    };
  }, [tasks, blocks]);

  if (loading) return <div className="p-4 text-muted-foreground text-sm">Cargando métricas...</div>;
  if (!metrics) return <div className="p-4 text-muted-foreground text-sm">No hay datos aún.</div>;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Métricas</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Focus Score */}
        <div className="p-5 rounded-2xl border border-border bg-card flex items-center gap-5">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={metrics.focusScore >= 70 ? 'hsl(var(--priority-20))' : metrics.focusScore >= 40 ? 'hsl(var(--priority-10))' : 'hsl(var(--destructive))'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28}
                strokeDashoffset={2 * Math.PI * 28 * (1 - metrics.focusScore / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold font-mono">{metrics.focusScore}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Focus Score</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.focusScore >= 70 ? '¡Estás en la zona!' : metrics.focusScore >= 40 ? 'Puedes mejorar' : 'Necesitas enfocarte más'}
            </p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Completadas', value: `${metrics.completed}/${metrics.total}`, sub: `${metrics.completionRate}%`, icon: Target, color: 'hsl(var(--priority-20))' },
            { label: 'Deep Work', value: `${Math.round(metrics.deepWorkMin / 60)}h ${metrics.deepWorkMin % 60}m`, icon: Flame, color: 'hsl(var(--priority-20))' },
            { label: 'Tiempo perdido', value: `~${Math.round(metrics.avgWastedMin / 60)}h ${metrics.avgWastedMin % 60}m`, sub: 'promedio/día', icon: Coffee, color: 'hsl(var(--priority-10))' },
            { label: 'Racha', value: `${metrics.streak} días`, icon: Zap, color: 'hsl(var(--priority-70))' },
          ].map((card) => (
            <div key={card.label} className="p-3.5 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-1.5">
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-xl font-bold font-mono">{card.value}</p>
              {card.sub && <span className="text-[10px] text-muted-foreground">{card.sub}</span>}
            </div>
          ))}
        </div>

        {/* Distribution */}
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold mb-3">Distribución del Tiempo</h3>
          <div className="space-y-2.5">
            {[
              { label: '20% Alta', pct: metrics.p20Pct, cssVar: '--priority-20', count: metrics.p20.length },
              { label: '70% Crecimiento', pct: metrics.p70Pct, cssVar: '--priority-70', count: metrics.p70.length },
              { label: '10% Reactivo', pct: metrics.p10Pct, cssVar: '--priority-10', count: metrics.p10.length },
              { label: 'Opcional', pct: metrics.totalPlannedMin > 0 ? 100 - metrics.p20Pct - metrics.p70Pct - metrics.p10Pct : 0, cssVar: '--priority-optional', count: metrics.pOpt.length },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label} ({item.count})</span>
                  <span className="font-mono font-medium">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, backgroundColor: `hsl(var(${item.cssVar}))` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extra stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl border border-border bg-card text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Pendientes</span>
            <span className="text-lg font-bold font-mono">{metrics.pending}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-card text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Fallidas</span>
            <span className="text-lg font-bold font-mono text-destructive">{metrics.failed}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-card text-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Prom/día</span>
            <span className="text-lg font-bold font-mono">{metrics.avgTasksPerDay}</span>
          </div>
        </div>

        {/* Insights */}
        {metrics.insights.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-semibold mb-3">Consejos</h3>
            <div className="space-y-2.5">
              {metrics.insights.map((insight, i) => (
                <div key={i} className={`flex items-start gap-2.5 text-sm p-2.5 rounded-lg ${
                  insight.type === 'warning' ? 'bg-destructive/10' :
                  insight.type === 'success' ? 'bg-green-500/10' :
                  'bg-primary/5'
                }`}>
                  {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> :
                   insight.type === 'success' ? <TrendingUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> :
                   <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  <span className="text-foreground/80">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
