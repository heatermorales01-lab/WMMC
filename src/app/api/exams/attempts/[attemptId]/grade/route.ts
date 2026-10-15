import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// PATCH — califica UNA respuesta abierta (se llama una vez por cada
// pregunta que el admin va calificando en la pantalla de revisión). Las
// preguntas de selección única no se tocan por aquí — ya se autocalifican
// al enviar el examen.
export const PATCH = withAdmin(async (req, { params }) => {
  try {
    const { questionId, puntajeObtenido, observacionEvaluador } = await req.json();
    if (!questionId) throw new AppError('questionId es obligatorio', 400);
    if (puntajeObtenido == null || isNaN(Number(puntajeObtenido)) || Number(puntajeObtenido) < 0) {
      throw new AppError('El puntaje debe ser un número mayor o igual a 0', 400);
    }

    const attempt = await (prisma as any).examAttempt.findUnique({ where: { id: params.attemptId } });
    if (!attempt) throw new AppError('Intento no encontrado', 404);
    if (attempt.estado === 'EN_PROGRESO') throw new AppError('Este trabajador todavía no ha enviado el examen', 409);

    const question = await (prisma as any).examQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new AppError('Pregunta no encontrada', 404);
    if (question.tipo !== 'ABIERTA') throw new AppError('Solo se califican manualmente las preguntas abiertas', 400);
    if (Number(puntajeObtenido) > Number(question.puntaje)) {
      throw new AppError(`El puntaje no puede ser mayor a ${question.puntaje}`, 400);
    }

    const respuesta = await (prisma as any).examAnswer.upsert({
      where: { attemptId_questionId: { attemptId: params.attemptId, questionId } },
      update: { puntajeObtenido: Number(puntajeObtenido), observacionEvaluador: observacionEvaluador || null, calificada: true },
      create: {
        attemptId: params.attemptId,
        questionId,
        puntajeObtenido: Number(puntajeObtenido),
        observacionEvaluador: observacionEvaluador || null,
        calificada: true,
      },
    });

    return NextResponse.json({ ok: true, data: respuesta, message: 'Respuesta calificada' });
  } catch (e) { return handleError(e); }
});
