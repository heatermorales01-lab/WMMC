'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    FileText,
    CreditCard,
    Package,
    Settings,
    LogOut,
    ChevronRight,
    Bell,
    Menu,
    X,
    Calendar,
    Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import AuthGuard from '@/components/AuthGuard';
import toast from 'react-hot-toast';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/calendario', icon: Calendar, label: 'Calendario' },
    { to: '/clientes', icon: Users, label: 'Clientes', restricted: true },
    { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
    { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones', restricted: true },
    { to: '/pagos', icon: CreditCard, label: 'Pagos', restricted: true },
    { to: '/inventario', icon: Package, label: 'Inventario' },
    { to: '/horario', icon: Clock, label: 'Control de Horario' },
];

const NAV_ADMIN = [
    { to: '/usuarios', icon: Users, label: 'Usuarios' },
    { to: '/catalogo', icon: Settings, label: 'Catálogo & Precios' },
];

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isAdmin, isTrabajador, logout } = useAuthStore();

    const router = useRouter();
    const pathname = usePathname();

    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleNav = NAV.filter(
        (item) => !(isTrabajador && item.restricted)
    );

    const handleLogout = () => {
        logout();
        toast.success('Sesión cerrada');
        router.push('/login');
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <AuthGuard>
            <div className="flex h-screen bg-slate-50 overflow-hidden">
                {mobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={closeMobile}
                    />
                )}

                {/* SIDEBAR */}

                <aside
                    className={`
            fixed md:static
            inset-y-0
            left-0
            z-40
            w-72
            bg-white/95
            backdrop-blur-xl
            border-r
            border-slate-200
            shadow-xl
            flex
            flex-col
            shrink-0
            transform
            transition-transform
            duration-200
            ${mobileOpen
                            ? 'translate-x-0'
                            : '-translate-x-full md:translate-x-0'
                        }
          `}
                >
                    {/* Logo */}

                    <div className="px-6 py-5 border-b flex items-center justify-between">

                        <div className="flex items-center gap-3">

                            <img
                                src="/logo.png"
                                alt="WM"
                                className="h-12 w-auto rounded-lg drop-shadow-md"
                            />

                            <div>
                                <p className="font-display font-bold text-base text-slate-900">
                                    WM Muebles
                                </p>

                                <p className="text-xs uppercase tracking-widest text-slate-400">
                                    Contemporáneos
                                </p>

                            </div>

                        </div>

                        <button
                            onClick={closeMobile}
                            className="md:hidden text-slate-400"
                        >
                            <X size={20} />
                        </button>

                    </div>

                    {/* Navegación */}

                    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">

                        {visibleNav.map(({ to, icon: Icon, label, exact }) => {

                            const isActive = exact
                                ? pathname === to
                                : pathname.startsWith(to);

                            return (
                                <Link
                                    key={to}
                                    href={to}
                                    onClick={closeMobile}
                                    className={`
                    group
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-4
                    py-3
                    transition-all
                    duration-200
                    text-sm
                    font-medium
                    ${isActive
                                            ? 'bg-gradient-to-r from-wood-600 to-wood-500 text-white shadow-lg'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-wood-600'
                                        }
                  `}
                                >
                                    <div
                                        className={`w-1 h-6 rounded-full ${isActive ? 'bg-white' : 'bg-transparent'
                                            }`}
                                    />

                                    <Icon
                                        size={18}
                                        className="shrink-0 transition-transform group-hover:scale-110"
                                    />

                                    <span className="flex-1">{label}</span>
                                </Link>
                            );
                        })}

                        {isAdmin && (
                            <>
                                <div className="pt-5 pb-2 px-2">

                                    <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">

                                        Administración

                                    </p>

                                </div>

                                {NAV_ADMIN.map(({ to, icon: Icon, label }) => {

                                    const isActive = pathname.startsWith(to);

                                    return (
                                        <Link
                                            key={to}
                                            href={to}
                                            onClick={closeMobile}
                                            className={`
                        group
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        px-4
                        py-3
                        transition-all
                        duration-200
                        text-sm
                        font-medium
                        ${isActive
                                                    ? 'bg-gradient-to-r from-wood-600 to-wood-500 text-white shadow-lg'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-wood-600'
                                                }
                      `}
                                        >
                                            <div
                                                className={`w-1 h-6 rounded-full ${isActive ? 'bg-white' : 'bg-transparent'
                                                    }`}
                                            />

                                            <Icon
                                                size={18}
                                                className="transition-transform group-hover:scale-110"
                                            />

                                            <span className="flex-1">{label}</span>
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>

                    {/* Usuario */}

                    <div className="border-t p-4">

                        <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3 shadow-sm">

                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wood-500 to-wood-700 flex items-center justify-center text-white font-bold">

                                {user?.nombre?.charAt(0).toUpperCase()}

                            </div>

                            <div className="flex-1 overflow-hidden">

                                <p className="font-semibold truncate">

                                    {user?.nombre}

                                </p>

                                <p className="text-xs text-slate-500 truncate">

                                    {user?.role}

                                </p>

                            </div>

                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                                <LogOut size={16} />
                            </button>

                        </div>

                    </div>
                </aside>

                {/* MAIN */}

                <div className="flex-1 flex flex-col overflow-hidden">

                    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-3 flex justify-between items-center">

                        <div className="flex items-center gap-3">

                            <button
                                onClick={() => setMobileOpen(true)}
                                className="md:hidden"
                            >
                                <Menu size={22} />
                            </button>

                            <div className="hidden md:flex items-center gap-2 text-slate-400">

                                <span>WM ERP</span>

                                <ChevronRight size={15} />

                                <span className="text-slate-700 font-medium">

                                    {user?.nombre}

                                </span>

                            </div>

                        </div>

                        <button className="p-2 rounded-lg hover:bg-slate-100">

                            <Bell size={18} />

                        </button>

                    </header>

                    <main className="flex-1 overflow-y-auto p-6">

                        {children}

                    </main>

                </div>
            </div>
        </AuthGuard>
    );
}