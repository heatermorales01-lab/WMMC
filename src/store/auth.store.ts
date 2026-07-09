import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  nombre: string;
  correo: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isTrabajador: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAdmin: false,
      isTrabajador: false,
      setAuth: (user, token) => {
        localStorage.setItem('wm_token', token);
        set({
          user,
          token,
          isAdmin: user.role === 'ADMINISTRADOR',
          isTrabajador: user.role === 'TRABAJADOR',
        });
      },
      logout: () => {
        localStorage.removeItem('wm_token');
        set({ user: null, token: null, isAdmin: false, isTrabajador: false });
      },
    }),
    { name: 'wm-auth' }
  )
);
