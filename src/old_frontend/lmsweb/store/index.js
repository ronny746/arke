import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'light' ? 'dark' : 'light';
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),
      applyTheme: () =>
        set((s) => {
          document.documentElement.classList.toggle('dark', s.theme === 'dark');
          return s;
        }),
    }),
    { name: 'lms-theme' }
  )
);

export const useSidebarStore = create((set) => ({
  open: true,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  setOpen: (v) => set({ open: v }),
}));

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      portal: null, // 'super-admin' | 'admin' | 'teacher'
      isAuthenticated: false,
      login: (user, portal) => set({ user, portal, isAuthenticated: true }),
      logout: () => set({ user: null, portal: null, isAuthenticated: false }),
    }),
    { name: 'lms-auth' }
  )
);
