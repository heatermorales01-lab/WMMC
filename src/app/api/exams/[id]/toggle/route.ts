import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// PATCH — publica/despublica el examen. Solo un examen `activo: true`
// aparece en la lista de exámenes disponibles del trabajador.
export const PATCH = withAdmin(async (_req, { params }) => {
  try {
    const exam = await (prisma as any).exam.findUnique({
      where: { id: params.id },
      include: { secciones: { include: { preguntas: true } } },
    });
    if (!exam) throw new AppError('Examen no encontrado', 404);

    const nuevoValor = !exam.activo;
    if (nuevoValor) {
      const sinPreguntas = exam.secciones.every((s: any) => s.preguntas.length === 0);
      if (exam.secciones.length === 0 || sinPreguntas) {
        throw new AppError('No se puede publicar un examen sin preguntas', 400);
      }
    }

    const updated = await (prisma as any).exam.update({ where: { id: params.id }, data: { activo: nuevoValor } });
    return NextResponse.json({
      ok: true,
      data: { activo: updated.activo },
      message: updated.activo ? 'Examen publicado — ya es visible para los trabajadores' : 'Examen despublicado',
    });
  } catch (e) { return handleError(e); }
});
