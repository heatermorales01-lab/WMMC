import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// GET — detalle completo del examen para el constructor de administrador:
// incluye la clave de respuestas (esCorrecta) y la guía del evaluador.
// NUNCA se usa esta ruta para la vista del trabajador (ver /[id]/take).
export const GET = withAdmin(async (_req, { params }) => {
  try {
    const exam = await (prisma as any).exam.findUnique({
      where: { id: params.id },
      include: {
        secciones: {
          orderBy: { orden: 'asc' },
          include: {
            preguntas: {
              orderBy: { orden: 'asc' },
              include: { opciones: { orderBy: { orden: 'asc' } } },
            },
          },
        },
      },
    });
    if (!exam) throw new AppError('Examen no encontrado', 404);
    return NextResponse.json({ ok: true, data: exam });
  } catch (e) { return handleError(e); }
});

// PUT — edita los metadatos del examen (no toca secciones/preguntas).
export const PUT = withAdmin(async (req, { params }) => {
  try {
    const { nombre, descripcion, instrucciones, duracionMinutos } = await req.json();
    if (!nombre?.trim()) throw new AppError('El nombre del examen es obligatorio', 400);

    const exam = await (prisma as any).exam.update({
      where: { id: params.id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion || null,
        instrucciones: instrucciones || null,
        duracionMinutos: duracionMinutos ? Number(duracionMinutos) : null,
      },
    });

    return NextResponse.json({ ok: true, data: exam, message: 'Examen actualizado' });
  } catch (e) { return handleError(e); }
});

// DELETE — solo se permite borrar un examen que todavía no tiene ningún
// intento (evita perder evaluaciones ya enviadas por trabajadores). Para
// retirar un examen en uso, se despublica con el toggle en vez de borrarlo.
export const DELETE = withAdmin(async (_req, { params }) => {
  try {
    const totalIntentos = await (prisma as any).examAttempt.count({ where: { examId: params.id } });
    if (totalIntentos > 0) {
      throw new AppError('Este examen ya tiene intentos registrados; despublícalo en vez de borrarlo', 409);
    }
    await (prisma as any).exam.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, message: 'Examen eliminado' });
  } catch (e) { return handleError(e); }
});
