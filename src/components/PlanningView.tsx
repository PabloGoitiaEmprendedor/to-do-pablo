import { useState } from 'react';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { TimelineView } from './TimelineView';

type QuickTab = 'hoy' | 'manana' | 'semana' | 'mes' | 'calendario';

export function PlanningView() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<QuickTab>('manana');
  const [selectedDate, setSelectedDate] = useState(addDays(today, 1));
  const [calendarMonth, setCalendarMonth] = useState(addDays(today, 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }));

  const tabs: { key: QuickTab; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'manana', label: 'Mañana' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
    { key: 'calendario', label: '' },
  ];

  const handleTabClick = (tab: QuickTab) => {
    setActiveTab(tab);
    if (tab === 'hoy') setSelectedDate(today);
    else if (tab === 'manana') setSelectedDate(addDays(today, 1));
    else if (tab === 'semana') {
      setWeekStart(startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }));
      setSelectedDate(startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }));
    }
    else if (tab === 'mes') setSelectedDate(addDays(today, 1));
  };

  // Calendar logic
  const monthStart = startOfWeek(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Week view days
  const weekDays = activeTab === 'semana'
    ? eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
    : [];

  // Month view days
  const monthViewDays = activeTab === 'mes'
    ? eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) })
    : [];

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-border px-3 py-2 space-y-2 shrink-0">
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabClick(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.key === 'calendario' ? <CalIcon className="w-3.5 h-3.5" /> : t.label}
            </button>
          ))}
        </div>

        {/* Week selector */}
        {activeTab === 'semana' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <button onClick={() => { const ns = addDays(weekStart, -7); setWeekStart(ns); setSelectedDate(ns); }} className="p-1 rounded hover:bg-accent">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium">
                {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
              </span>
              <button onClick={() => { const ns = addDays(weekStart, 7); setWeekStart(ns); setSelectedDate(ns); }} className="p-1 rounded hover:bg-accent">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-1">
              {weekDays.map((day) => (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                    isSameDay(day, selectedDate) ? 'bg-primary text-primary-foreground' :
                    isSameDay(day, today) ? 'bg-accent text-foreground' :
                    'hover:bg-accent text-foreground'
                  }`}
                >
                  <span className="text-[9px] uppercase">{format(day, 'EEE', { locale: es })}</span>
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Month view selector */}
        {activeTab === 'mes' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} className="p-1 rounded hover:bg-accent">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium capitalize">{format(calendarMonth, 'MMMM yyyy', { locale: es })}</span>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-accent">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <span key={d} className="text-[9px] text-muted-foreground font-medium py-0.5">{d}</span>
              ))}
              {calendarDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const inMonth = isSameMonth(day, calendarMonth);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`w-7 h-7 text-[10px] rounded-md transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground font-bold' :
                      isToday ? 'bg-accent font-bold text-foreground' :
                      inMonth ? 'text-foreground hover:bg-accent' : 'text-muted-foreground/40'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar picker */}
        {activeTab === 'calendario' && (
          <div className="max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} className="p-1 rounded hover:bg-accent">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium capitalize">{format(calendarMonth, 'MMMM yyyy', { locale: es })}</span>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 rounded hover:bg-accent">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <span key={d} className="text-[9px] text-muted-foreground font-medium py-0.5">{d}</span>
              ))}
              {calendarDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const inMonth = isSameMonth(day, calendarMonth);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`w-7 h-7 text-[10px] rounded-md transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground font-bold' :
                      isToday ? 'bg-accent font-bold text-foreground' :
                      inMonth ? 'text-foreground hover:bg-accent' : 'text-muted-foreground/40'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected date label */}
        <div className="text-xs text-muted-foreground capitalize">
          {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </div>
      </div>

      {/* Timeline for selected date */}
      <div className="flex-1 overflow-hidden">
        <TimelineView key={dateStr} date={dateStr} />
      </div>
    </div>
  );
}
