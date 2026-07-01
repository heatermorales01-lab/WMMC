'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FolderKanban, FileText, Package, ArrowRight, TrendingUp, Calendar, Truck, CreditCard } from 'lucide-react';
import { clientsApi, projectsApi, quotationsApi, inventoryApi, calendarApi } from '@/lib/api';
import type { Project, CalendarEvent } from '@/types';
import { formatCRC } from '@/types';
import { PageLoader, ProjectBadge, StatCard } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function DashboardPage() {
  const { isTrabajador } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0, projects: 0, quotations: 0, lowStock: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [upcoming, setUpcoming] = useState<(CalendarEvent & { _date: Date })[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // El rol Trabajador (producción) no tiene acceso a clientes ni cotizaciones,
        // así que esos datos se omiten directamente para ese rol.
        const [projects, inventory, events] = await Promise.all([
          projectsApi.list(),
          inventoryApi.list(),
          calendarApi.events(),
        ]);

        let clientsCount = 0;
        let quotationsCount = 0;
        if (!isTrabajador) {
          const [clients, quotations] = await Promise.all([
            clientsApi.list(),
            quotationsApi.list(),
          ]);
          clientsCount = clients.length;
          quotationsCount = quotations.length;
        }

        setStats({
          clients: clientsCount,
          projects: projects.length,
          quotations: quotationsCount,
          lowStock: inventory.lowStockCount,
        });
        setRecentProjects(projects.slice(0, 5));

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const upcomingEvents = (events as CalendarEvent[])
          .map((e) => ({ ...e, _date: parseLocalDate(e.date) }))
          .filter((e) => e._date >= todayStart)
          .filter((e) => !isTrabajador || e.type === 'INSTALACION') // ocultar cobros al trabajador
          .sort((a, b) => a._date.getTime() - b._date.getTime())
          .slice(0, 5);
        setUpcoming(upcomingEvents);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isTrabajador]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen general del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!isTrabajador && (
          <>
            <StatCard label="Clientes" value={stats.clients} icon={<Users size={20} />} />
            <StatCard label="Cotizaciones" value={stats.quotations} icon={<FileText size={20} />} />
          </>
        )}
        <StatCard label="Proyectos" value={stats.projects} icon={<FolderKanban size={20} />} />
        <StatCard
          label="Stock bajo"
          value={stats.lowStock}
          icon={<Package size={20} />}
          color={stats.lowStock > 0 ? 'red' : 'wood'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Proyectos recientes */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-wood-500" />
              Proyectos recientes
            </h2>
            <Link href="/proyectos" className="btn-ghost btn-sm">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Sin proyectos aún</td></tr>
                ) : (
                  recentProjects.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-slate-900">{p.nombreProyecto}</td>
                      <td>{p.client?.nombre || '—'}</td>
                      <td><ProjectBadge status={p.estado} /></td>
                      <td>
                        <Link href={`/proyectos/${p.id}`} className="btn-ghost btn-sm">
                          Ver <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-wood-500" /> Próximos eventos
            </h2>
            <Link href="/calendario" className="btn-ghost btn-sm">Ver calendario</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin eventos próximos</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/proyectos/${e.projectId}`}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    e.type === 'INSTALACION' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {e.type === 'INSTALACION' ? <Truck size={15} /> : <CreditCard size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{e.clientName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {e.type === 'INSTALACION' ? 'Instalación' : `Cobro${e.porcentaje ? ` (${e.porcentaje}%)` : ''}`}
                      {e.monto && !isTrabajador ? ` — ${formatCRC(e.monto)}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {e._date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
