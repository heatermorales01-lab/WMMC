'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FolderKanban, FileText, CreditCard,
  Package, Settings, LogOut, ChevronRight, Bell, Menu, X, Calendar, Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';



const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/calendario', icon: Calendar,       label: 'Calendario' },
  { to: '/clientes',  icon: Users,           label: 'Clientes',     restricted: true },
  { to: '/proyectos', icon: FolderKanban,    label: 'Proyectos' },
  { to: '/cotizaciones', icon: FileText,     label: 'Cotizaciones', restricted: true },
  { to: '/pagos',     icon: CreditCard,      label: 'Pagos',        restricted: true },
  { to: '/inventario',icon: Package,         label: 'Inventario' },
  { to: '/horario',   icon: Clock,           label: 'Control de Horario' },
];

const NAV_ADMIN = [
  { to: '/usuarios',  icon: Users,    label: 'Usuarios' },
  { to: '/catalogo',  icon: Settings, label: 'Catálogo & Precios' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isTrabajador, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV.filter((item) => !(isTrabajador && item.restricted));

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r flex flex-col shrink-0
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.png" alt="WM Muebles Contemporáneos" className="h-10 w-auto rounded-md shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-900 text-sm leading-tight truncate">WM Muebles</p>
              <p className="text-xs text-slate-400 truncate">Contemporáneos</p>
            </div>
          </div>
          <button onClick={closeMobile} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label, exact }) => {
            const isActive = exact ? pathname === to : pathname?.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                onClick={closeMobile}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administración</p>
              </div>
              {NAV_ADMIN.map(({ to, icon: Icon, label }) => {
                const isActive = pathname?.startsWith(to);
                return (
                  <Link
                    key={to}
                    href={to}
                    onClick={closeMobile}
                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  >
                    <Icon size={16} />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-wood-100 flex items-center justify-center shrink-0">
              <span className="text-wood-700 font-bold text-xs">
                {user?.nombre?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-sm text-slate-400">
              <span>WM ERP</span>
              <ChevronRight size={14} />
            </div>
          </div>
          <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <Bell size={18} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
