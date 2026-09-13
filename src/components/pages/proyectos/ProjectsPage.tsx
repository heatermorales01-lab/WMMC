'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, Search, ArrowRight } from 'lucide-react';
import { projectsApi } from '@/lib/api';
import type { Project, ProjectStatus } from '@/types';
import { formatDate } from '@/types';
import { PageLoader, ProjectBadge, EmptyState } from '@/components/ui';

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'COTIZACION', label: 'Cotización' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'PRODUCCION', label: 'Producción' },
  { value: 'INSTALACION', label: 'Instalación' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    projectsApi.list().then((data) => {
      setProjects(data);
      setFiltered(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(projects.filter((p) => {
      const matchSearch = p.nombreProyecto.toLowerCase().includes(q) ||
        p.client?.nombre?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || p.estado === statusFilter;
      return matchSearch && matchStatus;
    }));
  }, [search, statusFilter, projects]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Proyectos</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar proyecto o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s.value
                  ? 'bg-wood-500 text-white'
                  : 'bg-white border text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Instalación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={<FolderKanban size={24} />} title="Sin proyectos" description="Los proyectos se crean desde el perfil de un cliente" />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/proyectos/${p.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="font-semibold text-slate-900">{p.nombreProyecto}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Link href={`/clientes/${p.clientId}`} className="text-wood-600 hover:underline">
                        {p.client?.nombre}
                      </Link>
                    </td>
                    <td className="text-slate-500">{p.ubicacion || '—'}</td>
                    <td><ProjectBadge status={p.estado} /></td>
                    <td>{formatDate(p.fechaInstalacionTentativa)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
