import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';
import { preguntasQueCuentan, sumarPuntaje } from '@/lib/exam-helpers';

// POST — cierra la revisión: exige que todas las preguntas abiertas (de
// secciones que cuentan para la nota) ya tengan puntaje asignado, calcula
// la nota final y marca el intento como REVISADO — a partir de ahí el
// trabajador ya puede ver su resultado.
export const POST = withAdmin(async (req, { params }, user) => {
  try {
    const { resultadoPractica, observacionesPractica, observacionesEvaluador } = await req.json().catch(() => ({}));

    const attempt = await (prisma as any).examAttempt.findUnique({
      where: { id: params.attemptId },
      include: { respuestas: true },
    });
    if (!attempt) throw new AppError('Intento no encontrado', 404);
    if (attempt.estado === 'EN_PROGRESO') throw new AppError('Este trabajador todavía no ha enviado el examen', 409);
    if (attempt.estado === 'REVISADO') throw new AppError('Este intento ya fue revisado', 409);

    const exam = await (prisma as any).exam.findUnique({
      where: { id: attempt.examId },
      include: { secciones: { include: { preguntas: true } } },
    });
    if (!exam) throw new AppError('Examen no encontrado', 404);

    const respuestasPorPregunta = new Map(attempt.respuestas.map((r: any) => [r.questionId, r]));
    const pendientes = preguntasQueCuentan(exam.secciones).filter((p) => {
      if (p.tipo !== 'ABIERTA') return false;
      const r: any = respuestasPorPregunta.get(p.id);
      return !r || !r.calificada;
    });
    if (pendientes.length > 0) {
      throw new AppError(`Todavía hay ${pendientes.length} respuesta(s) abierta(s) sin calificar`, 400);
    }

    const puntajeAutomatico = sumarPuntaje(exam.secciones, respuestasPorPregunta as any, 'SELECCION_UNICA');
    const puntajeManual = sumarPuntaje(exam.secciones, respuestasPorPregunta as any, 'ABIERTA');
    const notaFinal = puntajeAutomatico + puntajeManual;

    const updated = await (prisma as any).examAttempt.update({
      where: { id: params.attemptId },
      data: {
        estado: 'REVISADO',
        evaluadorId: user.userId,
        fechaRevision: new Date(),
        puntajeAutomatico,
        puntajeManual,
        notaFinal,
        resultadoPractica: resultadoPractica || null,
        observacionesPractica: observacionesPractica || null,
        observacionesEvaluador: observacionesEvaluador || null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { notaFinal: updated.notaFinal, puntajeMaximo: updated.puntajeMaximo },
      message: `Revisión finalizada. Nota final: ${notaFinal}/${updated.puntajeMaximo}`,
    });
  } catch (e) { return handleError(e); }
});
