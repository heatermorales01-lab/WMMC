import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError } from '@/lib/errors';

// GET — bandeja de intentos para el administrador, con filtros opcionales
// por estado y por examen. Es la lista desde la que se entra a revisar
// cada evaluación enviada.
export const GET = withAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || undefined;
    const examId = searchParams.get('examId') || undefined;

    const attempts = await (prisma as any).examAttempt.findMany({
      where: {
        ...(estado ? { estado } : {}),
        ...(examId ? { examId } : {}),
      },
      orderBy: [{ fechaEnvio: 'desc' }, { fechaCreacion: 'desc' }],
      include: {
        exam: { select: { nombre: true } },
        worker: { select: { nombre: true, correo: true } },
        evaluador: { select: { nombre: true } },
      },
    });

    const data = attempts.map((a: any) => ({
      id: a.id,
      examNombre: a.exam.nombre,
      trabajador: a.worker.nombre,
      puesto: a.puesto,
      estado: a.estado,
      fechaCreacion: a.fechaCreacion,
      fechaEnvio: a.fechaEnvio,
      fechaRevision: a.fechaRevision,
      notaFinal: a.notaFinal,
      puntajeMaximo: a.puntajeMaximo,
      evaluador: a.evaluador?.nombre || null,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (e) { return handleError(e); }
});
