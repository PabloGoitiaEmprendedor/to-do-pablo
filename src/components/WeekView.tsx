import { getWeekDates } from '@/store/appStore';
import { TimelineView } from './TimelineView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

export function WeekView() {
  const dates = getWeekDates();
  const [selectedDate, setSelectedDate] = useState(dates[0]);

  return (
    <div className="flex flex-col h-full">
      {/* Date tabs */}
      <div className="flex border-b border-border overflow-x-auto shrink-0">
        {dates.map((d) => {
          const dateObj = new Date(d + 'T00:00:00');
          const isActive = d === selectedDate;
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="capitalize">{format(dateObj, 'EEE d', { locale: es })}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline for selected date */}
      <div className="flex-1 overflow-hidden">
        <TimelineView key={selectedDate} date={selectedDate} />
      </div>
    </div>
  );
}
