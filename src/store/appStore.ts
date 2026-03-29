import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, addDays } from 'date-fns';

export type SidebarPage = 'today' | 'planning' | 'routines' | 'priority-20' | 'priority-70' | 'priority-10' | 'priority-optional' | 'recurring-20' | 'recurring-70' | 'recurring-10' | 'categories' | 'metrics' | 'habits' | 'eisenhower';

interface AppStore {
  currentDate: string;
  activePage: SidebarPage;
  sidebarOpen: boolean;
  xp: number;
  level: number;
  addXp: (amount: number) => void;
  setCurrentDate: (date: string) => void;
  setActivePage: (page: SidebarPage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const XP_PER_LEVEL = 1000;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentDate: format(new Date(), 'yyyy-MM-dd'),
      activePage: 'today',
      sidebarOpen: false,
      xp: 0,
      level: 1,
      addXp: (amount) => set((state) => {
        const newTotalXp = Math.max(0, state.xp + amount);
        const newLevel = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;
        return { xp: newTotalXp, level: newLevel };
      }),
      setCurrentDate: (date) => set({ currentDate: date }),
      setActivePage: (page) => set({ activePage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'deepflow-app-storage',
      partialize: (state) => ({ xp: state.xp, level: state.level }),
    }
  )
);

export const getTomorrowDate = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');
export const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');
export const getWeekDates = () => {
  const dates: string[] = [];
  for (let i = 2; i <= 7; i++) {
    dates.push(format(addDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return dates;
};
