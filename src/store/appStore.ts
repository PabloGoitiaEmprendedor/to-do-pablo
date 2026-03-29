import { create } from 'zustand';
import { format, addDays } from 'date-fns';

export type SidebarPage = 'today' | 'planning' | 'routines' | 'priority-20' | 'priority-70' | 'priority-10' | 'priority-optional' | 'metrics' | 'habits' | 'eisenhower';

interface AppStore {
  currentDate: string;
  activePage: SidebarPage;
  sidebarOpen: boolean;
  setCurrentDate: (date: string) => void;
  setActivePage: (page: SidebarPage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  activePage: 'today',
  sidebarOpen: false,
  setCurrentDate: (date) => set({ currentDate: date }),
  setActivePage: (page) => set({ activePage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

export const getTomorrowDate = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');
export const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');
export const getWeekDates = () => {
  const dates: string[] = [];
  for (let i = 2; i <= 7; i++) {
    dates.push(format(addDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return dates;
};
