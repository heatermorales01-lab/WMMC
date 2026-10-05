'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Paperclip, Upload, Trash2, FileText, Image,
  FileCheck, Package, Camera, File, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { filesApi } from '@/lib/api';
import { Spinner, Confirm } from './ui';
import { useAuthStore } from '@/store/auth.store';

const FILE_TYPES = [
  { value: 'CONTRATO',   label: 'Contrato',    icon: FileCheck },
  { value: 'COMPROBANTE',label: 'Comprobante', icon: FileText  },
  { value: 'DISEÑO',     label: 'Diseño',      icon: Package   },
  { value: 'RENDER',     label: 'Render',      icon: Image     },
  { value: 'FOTO',       label: 'Foto',        icon: Camera    },
  { value: 'OTRO',       label: 'Otro',        icon: File      },
];

interface ProjectFile {
  id: string;
  tipo: string;
  nombreArchivo: string;
  urlArchivo: string;
  fechaSubida: string;
}

function fileIcon(tipo: string) {
  const found = FILE_TYPES.find((t) => t.value === tipo);
  const Icon = found?.icon ?? File;
  return <Icon size={15} />;
}

function formatSize(name: string) {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return ext;
}

export default function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles]       = useState<ProjectFile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('CONTRATO');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
    const { isTrabajador } = useAuthStore();
    const visibleFileTypes = isTrabajador ? FILE_TYPES.filter((t) => t.value !== 'CONTRATO') : FILE_TYPES;
    const load = async () => {
        try {
            const data = await filesApi.list(projectId);
            setFiles(data);
        } finally {
            setLoading(false);
        }
    };

  useEffect(() => { load(); }, [projectId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await filesApi.upload(projectId, file, selectedType);
      toast.success('Archivo subido correctamente');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al subir archivo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await filesApi.delete(deleteId);
      toast.success('Archivo eliminado');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Error al eliminar archivo');
    } finally {
      setDeleting(false);
    }
  };

    const openFile = (url: string) => {
        window.open(url, "_blank");
    };

  if (loading) return (
    <div className="flex justify-center py-8"><Spinner /></div>
  );

  return (
    <div className="space-y-4">
      {/* Upload bar */}
      <div className="flex gap-2 flex-wrap items-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <Paperclip size={16} className="text-slate-400" />
        <span className="text-sm text-slate-500 mr-1">Tipo:</span>
              <select
                  className="input py-1 text-sm w-40"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
              >
                  {visibleFileTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
              </select>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileSelect}
        />
        <button
          className="btn-primary btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Spinner size="sm" /> : <><Upload size={13} /> Subir archivo</>}
        </button>
        <span className="text-xs text-slate-400">PDF, imágenes, Word · máx 10MB</span>
      </div>

      {/* Archivos agrupados por tipo */}
      {files.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Paperclip size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin archivos — sube el primero</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Agrupados */}
          {visibleFileTypes.map(({ value, label }) => {
            const group = files.filter((f) => f.tipo === value);
            if (group.length === 0) return null;
            return (
              <div key={value}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pt-3 pb-1">
                  {label} ({group.length})
                </p>
                {group.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="text-wood-500">{fileIcon(f.tipo)}</div>
                    <button
                      className="flex-1 text-left text-sm text-slate-800 hover:text-wood-600 truncate"
                      onClick={() => openFile(f.urlArchivo)}
                    >
                      {f.nombreArchivo}
                    </button>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatSize(f.nombreArchivo)}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(f.fechaSubida).toLocaleDateString('es-CR')}
                    </span>
                    <button
                      onClick={() => setDeleteId(f.id)}
                      className="opacity-0 group-hover:opacity-100 btn-ghost btn-sm text-danger p-1 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <Confirm
          message="¿Eliminar este archivo? Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
