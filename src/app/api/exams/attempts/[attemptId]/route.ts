import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { handleError, AppError } from '@/lib/errors';

// GET — el propio intento del trabajador: mientras está EN_PROGRESO sirve
// para retomarlo; una vez REVISADO, es la pantalla de resultado. Nunca
// expone la clave de respuestas ni la guía del evaluador. Si todavía no
// está REVISADO, tampoco expone puntajes (ni siquiera el automático) para
// no adelantar nada antes de que el admin cierre la revisión.
export const GET = withAuth(async (_req, { params }, user) => {
  try {
    const attempt = await (prisma as any).examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        exam: { select: { nombre: true } },
        evaluador: { select: { nombre: true } },
        respuestas: true,
      },
    });
    if (!attempt) throw new AppError('Intento no encontrado', 404);
    if (attempt.workerId !== user.userId) throw new AppError('Sin permiso', 403);

    const revisado = attempt.estado === 'REVISADO';

    return NextResponse.json({
      ok: true,
      data: {
        id: attempt.id,
        examNombre: attempt.exam.nombre,
        estado: attempt.estado,
        puesto: attempt.puesto,
        fechaCreacion: attempt.fechaCreacion,
        fechaEnvio: attempt.fechaEnvio,
        fechaRevision: attempt.fechaRevision,
        respuestas: attempt.respuestas.map((r: any) => ({
          questionId: r.questionId,
          opcionId: r.opcionId,
          textoRespuesta: r.textoRespuesta,
        })),
        // Solo una vez revisado se destapa el resultado.
        puntajeAutomatico: revisado ? attempt.puntajeAutomatico : null,
        puntajeManual: revisado ? attempt.puntajeManual : null,
        puntajeMaximo: revisado ? attempt.puntajeMaximo : null,
        notaFinal: revisado ? attempt.notaFinal : null,
        observacionesEvaluador: revisado ? attempt.observacionesEvaluador : null,
        evaluador: revisado ? attempt.evaluador?.nombre : null,
      },
    });
  } catch (e) { return handleError(e); }
});

// PATCH — autoguardado de UNA respuesta mientras el trabajador completa
// el examen. Se llama por cada pregunta que responde/cambia (el frontend
// lo dispara en cada cambio con un pequeño debounce).
export const PATCH = withAuth(async (req, { params }, user) => {
  try {
    const { questionId, opcionId, textoRespuesta } = await req.json();
    if (!questionId) throw new AppError('questionId es obligatorio', 400);

    const attempt = await (prisma as any).examAttempt.findUnique({ where: { id: params.attemptId } });
    if (!attempt) throw new AppError('Intento no encontrado', 404);
    if (attempt.workerId !== user.userId) throw new AppError('Sin permiso', 403);
    if (attempt.estado !== 'EN_PROGRESO') throw new AppError('Este examen ya fue enviado y no se puede modificar', 409);

    const respuesta = await (prisma as any).examAnswer.upsert({
      where: { attemptId_questionId: { attemptId: params.attemptId, questionId } },
      update: { opcionId: opcionId || null, textoRespuesta: textoRespuesta ?? null },
      create: { attemptId: params.attemptId, questionId, opcionId: opcionId || null, textoRespuesta: textoRespuesta ?? null },
    });

    return NextResponse.json({ ok: true, data: { questionId: respuesta.questionId } });
  } catch (e) { return handleError(e); }
});
