'use client';
import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { auditApi, usersApi } from '@/lib/api';
import { PageLoader, EmptyState } from '@/components/ui';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TABS = [
  { id: 'catalogo', label: 'Catálogo y precios' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'horario', label: 'Correcciones de horario' },
] as const;

export default function AuditLogsPage() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('catalogo');
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const load = () => {
    setLoading(true);
    auditApi.list(tab, { userId: userId || undefined, desde: desde || undefined, hasta: hasta || undefined })
      .then(setLogs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { usersApi.list().then(setUsers).catch(() => {}); }, []);
  useEffect(() => { load(); }, [tab, userId, desde, hasta]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ScrollText size={22} className="text-wood-500" /> Bitácoras
        </h1>
        <p className="text-sm text-slate-500">Trazabilidad de acciones realizadas por los usuarios del ERP</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id ? 'border-wood-500 text-wood-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card card-body">
        <div className="flex flex-wrap gap-3">
          <select className="input py-1.5 text-sm w-56" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <input type="date" className="input py-1.5 text-sm" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" className="input py-1.5 text-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title="Sin movimientos registrados" />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            {tab === 'catalogo' && (
              <>
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Elemento</th><th>Cambio</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td>{l.user?.nombre || '—'}</td>
                      <td>{l.modulo}</td>
                      <td>{l.accion}</td>
                      <td>{l.entidadNombre || '—'}</td>
                      <td className="text-xs text-slate-500 max-w-xs">
                        {l.valorAnterior ? <div>Antes: {JSON.stringify(l.valorAnterior)}</div> : null}
                        {l.valorNuevo ? <div>Después: {JSON.stringify(l.valorNuevo)}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {tab === 'inventario' && (
              <>
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Elemento</th><th>Movimiento</th><th>Cantidad</th><th>Detalle</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td>{l.user?.nombre || '—'}</td>
                      <td>{l.itemNombre}</td>
                      <td>{l.tipoMovimiento}</td>
                      <td>{l.cantidad ?? '—'}</td>
                      <td className="text-xs text-slate-500 max-w-xs">{l.detalle ? JSON.stringify(l.detalle) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {tab === 'horario' && (
              <>
                <thead><tr><th>Fecha</th><th>Admin</th><th>Trabajador</th><th>Campo</th><th>Antes</th><th>Después</th><th>Motivo</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td>{l.admin?.nombre || '—'}</td>
                      <td>{l.trabajador?.nombre || '—'}</td>
                      <td>{l.campo}</td>
                      <td className="text-xs text-slate-500">{l.valorAnterior || '—'}</td>
                      <td className="text-xs text-slate-500">{l.valorNuevo || '—'}</td>
                      <td className="text-xs text-slate-500">{l.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
